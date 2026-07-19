import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client for Server Components, Route Handlers and Server
 * Actions.
 *
 * Callers MUST use `getClaims()` (or `getUser()`) for authorization — never
 * `getSession()`, which reads cookie storage shared with the client and is
 * not revalidated (S1).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // The installed @supabase/ssr also passes anti-caching `headers`
        // (Cache-Control / Expires / Pragma, S8) as a second argument, but
        // Next.js offers no API to set response headers from this context —
        // `cookies()` only writes cookies. The proxy client applies those
        // headers to its NextResponse instead.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set headers. The
            // proxy refreshes the session on every request, so ignoring this
            // is safe (S8).
          }
        },
      },
    },
  );
}

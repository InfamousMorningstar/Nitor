import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookies for a request and returns the
 * verified JWT claims.
 *
 * Named `session.ts`, deliberately NOT `proxy.ts`: the root `proxy.ts` is a
 * Next.js file convention, and two same-named files at different layers
 * invites edits landing in the wrong one.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // S8. The library hands us the anti-caching headers it wants set
          // alongside auth cookies (Cache-Control / Expires / Pragma). Apply
          // them rather than hardcoding the values, so they cannot drift.
          //
          // THIS IS THE ONLY PLACE THEY CAN LAND: the server client
          // (src/lib/supabase/server.ts) writes through Next's cookies()
          // store, which has no API for setting response headers. Without
          // this loop, a CDN or reverse proxy can cache a response carrying
          // a session and serve one user's token to another.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // S1: getClaims() validates the JWT signature against the project's
  // published public keys on every call. Never getSession() here — it reads
  // client-shared cookie storage and is not revalidated.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}

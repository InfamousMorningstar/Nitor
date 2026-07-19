import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the publishable key (S2), which is safe to
 * ship to the browser — it carries the same low privileges as the old anon
 * key and RLS is the real boundary.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

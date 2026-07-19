import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * SUPABASE_SECRET_KEY is server-only: it must never reach a client bundle, a
 * NEXT_PUBLIC_ variable, or a log line. Three deliberate choices enforce that:
 *
 *  1. This is a FUNCTION, not a module-scope singleton. A top-level
 *     `createSupabaseClient(url, secret)` would read the secret during module
 *     evaluation, so any accidental import from a Client Component would drag
 *     the read into the client graph. Constructed per call, the key is only
 *     ever touched inside a server-side request.
 *  2. The thrown error names the MISSING VARIABLE, never its value. A message
 *     that interpolated the key would leak it into logs and error reporters.
 *  3. No session persistence or token refresh. This client authenticates as
 *     the service role on every request and has no user session to keep; the
 *     defaults would otherwise try to write to a storage adapter that does not
 *     exist on the server.
 *
 * Callers must establish WHO the request is for from verified claims on the
 * user-scoped server client first. This client answers no authorization
 * question — it is the thing that acts once the answer is already known.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY",
    );
  }

  return createSupabaseClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

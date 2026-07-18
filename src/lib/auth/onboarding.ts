import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Where a just-authenticated user belongs.
 *
 * Onboarding used to be gated only by /onboarding's own client-side effect, so
 * whether a first-time user ever saw it depended entirely on the auth link
 * carrying `next=/onboarding`. Email/password signup does supply that, but an
 * invite, a magic link, or any future PKCE provider does not — those users
 * landed straight on /today with `onboarding_completed` still false. The check
 * belongs at the point authentication actually succeeds, which is here.
 *
 * Fails safe in every uncertain case: no verified user, no profile row, a
 * failed profile lookup, or either call REJECTING all route to /onboarding
 * rather than leaking a protected destination on an unverified assumption.
 * /onboarding is the cheapest possible wrong answer — an already-onboarded
 * user who somehow lands there is bounced to /today by the page's own effect.
 *
 * The whole body is wrapped because both calls can reject, not just resolve
 * with `{ error }`: a transport or runtime failure during getClaims() or the
 * profile query would otherwise escape into the route handler, which awaits
 * this without a catch, and turn a SUCCESSFUL code exchange or OTP
 * verification into a 500. The user would be authenticated with cookies
 * already set, yet shown a server error — strictly worse than the extra
 * onboarding hop, and a failure mode this gate introduced rather than found.
 *
 * `next` must already have been through safeNext(), and is returned VERBATIM —
 * it may legitimately still be percent-encoded (see safeNext's contract).
 */
export async function postAuthDestination(
  supabase: SupabaseClient,
  next: string,
): Promise<string> {
  try {
    // S1: getClaims() verifies the JWT signature. Never getSession() — it reads
    // cookie storage shared with the client and is not revalidated.
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || !userId) return "/onboarding";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) return "/onboarding";
    // Strict `=== true`: a missing row, a null column, or any non-boolean all
    // mean "not proven complete", and proof is what this gate needs.
    return profile?.onboarding_completed === true ? next : "/onboarding";
  } catch {
    return "/onboarding";
  }
}

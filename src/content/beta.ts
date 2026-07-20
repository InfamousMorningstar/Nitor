/**
 * Single source of truth for beta-programme copy and the feedback address, so
 * the landing hero, signup form and in-app chip can never drift apart.
 */

export const FEEDBACK_EMAIL = "s.ahmad0147@gmail.com";

export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
  "Nitor beta feedback",
)}`;

export const BETA_LABEL = "Closed Beta";

/**
 * Fine print under the hero subhead.
 *
 * Says invite-only plainly because that is currently enforced by circumstance,
 * not by choice of wording: the project still uses Supabase's built-in email
 * service, which only delivers to members of the Supabase organisation, so an
 * outside address that signs up never receives its confirmation link. Calling
 * this an open beta would invite people into a door that does not open.
 */
export const BETA_HERO_NOTICE =
  "Nitor is in closed beta — accounts are invite-only while I let people in a few at a time. Every feature is unlocked and free, and I’m building it in the open, so expect rough edges, occasional bugs, and changes as I go. Pricing will be introduced when Nitor leaves beta.";

/** Precedes the feedback link in the hero notice. */
export const BETA_HERO_FEEDBACK_LEAD = "Report anything that breaks";

export const BETA_HERO_FEEDBACK_TAIL =
  "— it’s the fastest way to shape what ships.";

/**
 * Under the signup submit button. NOTE: "your data is safe" is a real promise —
 * it is only true once Phase 2 lands (Supabase auth + Postgres + RLS behind
 * HabitRepository). Do not ship this notice while auth is stubbed and habits
 * live in MockHabitRepository.
 */
export const BETA_SIGNUP_NOTICE =
  "Free during beta, no card required. Your data is safe, but features may change and bugs are possible — you can export everything from Settings at any time.";

/**
 * Short line directly under the signup submit button, above the longer notice.
 *
 * Deliberately separate from BETA_SIGNUP_NOTICE and deliberately terse: the
 * fine print is skimmed, and this is the one fact a stranger needs BEFORE they
 * fill the form. Without an invite the submit cannot succeed — built-in
 * Supabase email only delivers to members of the Supabase organisation, so the
 * confirmation link never arrives and the account is unusable.
 *
 * REMOVING THIS AT PUBLIC BETA: delete this constant and its <p> in
 * src/app/(auth)/signup/page.tsx, flip BETA_LABEL back to "Public Beta", and
 * restore the open-signup wording in BETA_HERO_NOTICE. Do it only once custom
 * SMTP is live on a registered domain and a signup from a non-org address has
 * actually been observed to complete — the copy is downstream of whether the
 * email sends, not the other way round.
 */
export const BETA_SIGNUP_CLOSED_LINE =
  "Sign-ups are closed for now — invite only.";

/** Tooltip on the in-app Beta chip. */
export const BETA_CHIP_TOOLTIP =
  "You’re using a beta build. Features may change and bugs are expected — send feedback.";

import type { AuthError } from "@supabase/supabase-js";

/**
 * Nitor's own copy for auth failures. Raw Supabase `error.message` strings
 * never reach the DOM: they are written for developers, they drift with the
 * API, and under some dashboard configurations they reveal whether an email
 * address already has an account. Every mapping below is keyed on the stable
 * `error.code` (verified against installed @supabase/auth-js error-codes.d.ts)
 * and falls back to copy that is safe when it knows nothing.
 */

const TOO_MANY_ATTEMPTS = "Too many attempts. Wait a minute and try again.";
const WEAK_PASSWORD =
  "That password isn't strong enough. Try a longer or less common one.";

export const RESET_LINK_EXPIRED_MESSAGE =
  "This reset link has expired. Request a new one below.";

/**
 * A recovery link that no longer carries a usable session. Detected by name
 * for AuthSessionMissingError (its `code` is undefined — verified in
 * auth-js errors.js) and by code for the server-reported variants.
 */
export function isExpiredRecovery(error: AuthError): boolean {
  return (
    error.name === "AuthSessionMissingError" ||
    error.code === "session_expired" ||
    error.code === "session_not_found" ||
    error.code === "otp_expired"
  );
}

export function signUpErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "weak_password":
      return WEAK_PASSWORD;
    case "email_address_invalid":
      return "That email address can't be used. Try a different one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return TOO_MANY_ATTEMPTS;
    case "captcha_failed":
      return "Verification failed. Please try again.";
    default:
      // Deliberately covers user_already_exists / email_exists. With email
      // confirmation on, Supabase already obfuscates signups for existing
      // addresses; if that setting ever changes, this default keeps the page
      // from confirming that an address has an account.
      return "Could not create your account. Please try again.";
  }
}

export function updatePasswordErrorMessage(error: AuthError): string {
  if (isExpiredRecovery(error)) return RESET_LINK_EXPIRED_MESSAGE;
  switch (error.code) {
    case "same_password":
      return "Your new password must be different from your old one.";
    case "weak_password":
      return WEAK_PASSWORD;
    case "over_request_rate_limit":
      return TOO_MANY_ATTEMPTS;
    default:
      return "Could not update your password. Please try again.";
  }
}

/**
 * Copy for the `?error=` codes Nitor's own auth routes emit (/auth/confirm,
 * /auth/callback). The param is attacker-editable like any URL, so unknown
 * values map to nothing — never echo it.
 */
export function authLinkErrorMessage(code: string | null): string | undefined {
  switch (code) {
    case "invalid_link":
      return "That link is invalid or has expired.";
    case "missing_code":
    case "auth_failed":
      return "Sign-in failed. Please try again.";
    default:
      return undefined;
  }
}

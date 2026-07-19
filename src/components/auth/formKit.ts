/**
 * Shared style tokens + tiny helpers for the auth pages (login/signup/
 * forgot-password/reset-password) and onboarding. Mirrors the class
 * conventions already used in HabitForm.tsx — flat matte, hairline border,
 * amber focus ring. No new visual language introduced.
 */

export const eyebrow =
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";

export const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";

export const fieldInput =
  "w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))] focus:[border-color:rgb(var(--accent))]";

export const fieldInputError =
  "w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none transition-colors duration-[var(--dur-micro)] border-[rgb(var(--accent))] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))]";

export const primaryButton =
  "w-full rounded-lg py-3 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.99] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] disabled:opacity-50 disabled:pointer-events-none";

export const ghostButton =
  "text-sm [color:rgb(var(--text-dim))] hover:[color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] rounded-sm";

export const accentLink =
  "text-sm [color:rgb(var(--accent))] hover:[color:rgb(var(--accent-glow))] transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] rounded-sm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function emailError(value: string): string | undefined {
  if (!value.trim()) return "Email is required.";
  if (!isValidEmail(value)) return "Enter a valid email address.";
  return undefined;
}

export function requiredError(value: string, label = "This field"): string | undefined {
  if (!value.trim()) return `${label} is required.`;
  return undefined;
}

/**
 * Minimum 12 to match the Supabase project's password policy (S10). A lower
 * value here means a password the form accepts and the API rejects, surfacing
 * as a raw server error instead of Nitor's own message.
 */
export function passwordError(value: string, minLength = 12): string | undefined {
  if (!value) return "Password is required.";
  if (value.length < minLength) return `Use at least ${minLength} characters.`;
  return undefined;
}

/**
 * Simple 0..4 heuristic strength score — length + character variety.
 * No text judgment is derived from this; callers render it as a bar only.
 */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[0-9]/.test(value) && /[a-zA-Z]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value))) score++;
  return Math.min(4, score);
}

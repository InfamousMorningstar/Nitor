/**
 * Open-redirect guard for `?next=` (S9).
 *
 * Only same-origin relative paths are allowed through. Everything else — an
 * absolute URL, a protocol-relative `//evil.com`, or a backslash form some
 * browsers normalise to `//` — falls back. An attacker who controls `next`
 * otherwise gets to bounce a freshly-authenticated user to a site they own.
 */
const SAFE_NEXT = /^\/(?!\/)[^\\\s]*$/;

export function safeNext(
  next: string | null | undefined,
  fallback = "/today",
): string {
  if (!next) return fallback;
  return SAFE_NEXT.test(next) ? next : fallback;
}

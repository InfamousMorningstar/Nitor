/**
 * Open-redirect guard for `?next=` (S9).
 *
 * Only same-origin relative paths are allowed through. Everything else — an
 * absolute URL, a protocol-relative `//evil.com`, or a backslash form some
 * browsers normalise to `//` — falls back. An attacker who controls `next`
 * otherwise gets to bounce a freshly-authenticated user to a site they own.
 *
 * The whitespace ban is load-bearing too: browsers strip raw TAB/LF/CR from
 * a URL before parsing, so `/\t/evil.com` would otherwise reach the client
 * as `//evil.com`.
 */
const SAFE_NEXT = /^\/(?!\/)[^\\\s]*$/;

/**
 * Caller contract: pass the returned value to the redirect VERBATIM. The
 * guard deliberately admits percent-encoded forms like `/%2F%2Fevil.com`,
 * which are only safe while they stay encoded — a `decodeURIComponent()`
 * applied after validation turns one into `//evil.com` and reopens the
 * open-redirect this function exists to close.
 *
 * `fallback` is trusted as-is and must be a developer-supplied relative
 * path; it is never attacker-reachable, so it is not re-validated here.
 */
export function safeNext(
  next: string | null | undefined,
  fallback = "/today",
): string {
  if (!next) return fallback;
  return SAFE_NEXT.test(next) ? next : fallback;
}

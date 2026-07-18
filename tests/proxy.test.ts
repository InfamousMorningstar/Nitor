// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The route guard is the only thing standing between a signed-out visitor and
// a redirect to /login, so these tests drive the real proxy with the session
// layer stubbed to "no session" — the state a public page must survive.
const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock("@/lib/supabase/session", () => ({ updateSession }));

const { proxy } = await import("@/proxy");

/** Signed out: no claims, plain pass-through response. */
function signedOut() {
  updateSession.mockResolvedValue({ response: NextResponse.next(), claims: null });
}

/** Signed in: claims present. */
function signedIn() {
  updateSession.mockResolvedValue({
    response: NextResponse.next(),
    claims: { sub: "user-1" },
  });
}

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "https://nitor.test"));
}

/** The redirect target, or null when the guard let the request through. */
function redirectedTo(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/changelog",
  "/roadmap",
  "/privacy",
  "/terms",
  "/security",
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy — public routes while signed out", () => {
  it.each(PUBLIC_ROUTES)("%s is reachable without a session", async (pathname) => {
    signedOut();
    const response = await proxy(request(pathname));

    expect(redirectedTo(response)).toBeNull();
  });

  it.each(PUBLIC_ROUTES)("%s stays reachable while signed in", async (pathname) => {
    signedIn();
    const response = await proxy(request(pathname));

    // Only /login and /signup bounce an authenticated user away.
    expect(redirectedTo(response)).toBeNull();
  });
});

describe("proxy — the guard still guards", () => {
  it.each(["/today", "/habits", "/stats", "/insights", "/settings", "/pet"])(
    "%s redirects to /login when signed out",
    async (pathname) => {
      signedOut();
      const response = await proxy(request(pathname));

      expect(redirectedTo(response)).toBe("/login");
    },
  );

  it("preserves the original destination in ?next", async () => {
    signedOut();
    const response = await proxy(request("/habits?filter=archived"));

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.searchParams.get("next")).toBe("/habits?filter=archived");
  });

  it("does not treat an unlisted lookalike path as public", async () => {
    signedOut();
    // Prefix matching would be a hole; PUBLIC_PATHS is an exact-match set.
    const response = await proxy(request("/features/internal"));

    expect(redirectedTo(response)).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
// Adversarial variants.
//
// The allowlist is an exact-match Set, which is the right shape — but "right
// today" is only worth something if a later edit to prefix/startsWith matching
// breaks a test. These pin that.
//
// Every case asserts `seenAs`: the pathname the proxy ACTUALLY receives after
// the URL parser has canonicalized the target. Without that assertion a test
// like "/features/../internal redirects" would look like a traversal check
// while really just exercising "/internal" — passing for the wrong reason.
// ---------------------------------------------------------------------------

/** The request, plus the pathname the proxy will really see. */
function requestFor(target: string) {
  const req = new NextRequest(new URL(target, "https://nitor.test"));
  return { req, seenAs: req.nextUrl.pathname };
}

/**
 * Variants that reach the proxy verbatim and must NOT inherit public status.
 *
 * The third column is the redirect target actually observed. It is `/login/`
 * for the two trailing-slash cases: redirectTo() clones `request.nextUrl`, and
 * NextURL carries the original trailing slash onto the new pathname. That is
 * cosmetic — both forms resolve to the login route — but it is asserted as
 * observed rather than normalized away, so a future change to the redirect
 * construction shows up here instead of hiding behind a lenient matcher.
 */
const ESCAPE_ATTEMPTS: Array<[target: string, seenAs: string, redirect: string]> = [
  // Suffix/prefix escapes off a public route.
  ["/features/internal", "/features/internal", "/login"],
  ["/pricing/private", "/pricing/private", "/login"],
  ["/security/admin", "/security/admin", "/login"],
  ["/xfeatures", "/xfeatures", "/login"],
  ["/featuresx", "/featuresx", "/login"],
  ["/features.", "/features.", "/login"],
  // Case variants — the Set is case-sensitive and paths are not.
  ["/Features", "/Features", "/login"],
  ["/SECURITY", "/SECURITY", "/login"],
  ["/Pricing", "/Pricing", "/login"],
  // Separator variants that survive canonicalization.
  ["/features/", "/features/", "/login/"],
  ["/features//", "/features//", "/login/"],
  ["https://nitor.test//features", "//features", "/login"],
  // Encoded separators stay encoded, so these are single literal segments.
  ["/features%2finternal", "/features%2finternal", "/login"],
  ["/features%5cinternal", "/features%5cinternal", "/login"],
  ["/features/..%2finternal", "/features/..%2finternal", "/login"],
  ["/features%00", "/features%00", "/login"],
];

describe("proxy — adversarial variants stay private while signed out", () => {
  it.each(ESCAPE_ATTEMPTS)(
    "%s reaches the proxy as %s and redirects to %s",
    async (target, expected, redirect) => {
      signedOut();
      const { req, seenAs } = requestFor(target);

      expect(seenAs).toBe(expected);
      expect(redirectedTo(await proxy(req))).toBe(redirect);
    },
  );
});

describe("proxy — URL canonicalization happens before the guard", () => {
  // Raw dot-segments and percent-encoded dot-segments are both resolved by the
  // URL parser, so the proxy never sees a traversal — it sees the destination.
  // These assert that the destination is judged on its own merits.
  it.each([
    // Traversal out of a public route into a protected one: lands on the
    // protected route and is guarded, not waved through by its /features prefix.
    ["/features/../today", "/today", "/login"],
    ["/features/%2e%2e/today", "/today", "/login"],
    ["/features/%2E%2E/today", "/today", "/login"],
    ["/security/../../settings", "/settings", "/login"],
  ])("%s canonicalizes to %s and is still guarded", async (target, expected, destination) => {
    signedOut();
    const { req, seenAs } = requestFor(target);

    expect(seenAs).toBe(expected);
    expect(redirectedTo(await proxy(req))).toBe(destination);
  });

  it.each([
    // The mirror image: a traversal that resolves ONTO a public route is
    // allowed, because after canonicalization it genuinely is that route.
    ["/today/../features", "/features"],
    ["/%2e%2e/features", "/features"],
    ["/./features", "/features"],
  ])("%s canonicalizes to %s and is genuinely that public route", async (target, expected) => {
    signedOut();
    const { req, seenAs } = requestFor(target);

    expect(seenAs).toBe(expected);
    expect(redirectedTo(await proxy(req))).toBeNull();
  });

  it("a protocol-relative //features never reaches the proxy as a path at all", () => {
    // Resolved against the app origin, `//features` is an AUTHORITY, not a
    // path: the host becomes "features" and the path collapses to "/". It
    // cannot be used to smuggle a public path, because it is not one.
    const url = new URL("//features", "https://nitor.test");

    expect(url.host).toBe("features");
    expect(url.pathname).toBe("/");
  });
});

describe("proxy — protected routes preserve the destination", () => {
  it.each(["/today", "/habits", "/stats", "/insights", "/settings", "/pet"])(
    "%s round-trips through ?next verbatim",
    async (pathname) => {
      signedOut();
      const response = await proxy(request(`${pathname}?a=1&b=2`));

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe(`${pathname}?a=1&b=2`);
    },
  );
});

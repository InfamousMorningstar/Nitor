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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

const {
  exchangeCodeForSession,
  getClaims,
  getSession,
  profile,
  profileRejects,
  profileQuery,
} = vi.hoisted(() => ({
    exchangeCodeForSession: vi.fn(),
    getClaims: vi.fn(),
    // Present on the mock precisely so a test can prove the route never
    // reaches for it. getSession() is not an authorization primitive (S1).
    getSession: vi.fn(),
    profile: {
      current: { data: null, error: null } as {
        data: { onboarding_completed: unknown } | null;
        error: { message: string } | null;
      },
    },
    profileRejects: { current: false },
    profileQuery: { table: "", columns: "", eq: [] as unknown[] },
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession, getClaims, getSession },
    from: (table: string) => {
      profileQuery.table = table;
      return {
        select: (columns: string) => {
          profileQuery.columns = columns;
          return {
            eq: (...args: unknown[]) => {
              profileQuery.eq = args;
              return {
                maybeSingle: async () => {
                  // Supabase can REJECT, not just resolve with { error } — a
                  // transport or runtime failure. The route awaits the helper
                  // without a catch, so an escaping rejection would turn a
                  // SUCCESSFUL code exchange into a 500.
                  if (profileRejects.current) throw new Error("socket hang up");
                  return profile.current;
                },
              };
            },
          };
        },
      };
    },
  })),
}));

const ORIGIN = "http://localhost:3000";

/** `path` is the raw request-target, query string included. */
function get(path: string) {
  return GET(new NextRequest(`${ORIGIN}${path}`));
}

/** The signed-in user has finished onboarding. */
function onboarded() {
  profile.current = { data: { onboarding_completed: true }, error: null };
}

/** The signed-in user exists but has never completed onboarding. */
function notOnboarded() {
  profile.current = { data: { onboarding_completed: false }, error: null };
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    onboarded();
    profileRejects.current = false;
    profileQuery.table = "";
    profileQuery.columns = "";
    profileQuery.eq = [];
  });

  it("redirects to /login?error=missing_code without touching Supabase when code is absent", async () => {
    const res = await get("/auth/callback");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=missing_code`);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges the code and redirects an onboarded user to /today by default", async () => {
    const res = await get("/auth/callback?code=abc123");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("honours a validated next path for an onboarded user, query string included", async () => {
    const res = await get(
      "/auth/callback?code=abc123&next=%2Fhabits%3Ftab%3Darchive",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/habits?tab=archive`);
  });

  it("falls back to /today for a hostile next", async () => {
    const res = await get("/auth/callback?code=abc123&next=//evil.com");
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("keeps a percent-encoded next verbatim — never decoded into an authority", async () => {
    // Raw query value %2F%252F%252Fevil.com; searchParams.get() decodes it
    // once to "/%2F%2Fevil.com", which safeNext admits. The redirect must
    // carry that string untouched: a second decode would yield "//evil.com".
    const res = await get(
      "/auth/callback?code=abc123&next=%2F%252F%252Fevil.com",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/%2F%2Fevil.com`);
  });

  it("redirects to /login?error=auth_failed when the exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid grant" },
    });
    const res = await get("/auth/callback?code=stale");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=auth_failed`);
  });

  describe("onboarding gate", () => {
    it("sends a first-time user to /onboarding even though next defaults to /today", async () => {
      notOnboarded();
      const res = await get("/auth/callback?code=abc123");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("sends an incomplete user to /onboarding even when the link asks for /today", async () => {
      notOnboarded();
      const res = await get("/auth/callback?code=abc123&next=%2Ftoday");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("treats a missing profile row as incomplete onboarding", async () => {
      profile.current = { data: null, error: null };
      const res = await get("/auth/callback?code=abc123&next=%2Fstats");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("fails safe to /onboarding when the profile lookup errors", async () => {
      profile.current = { data: null, error: { message: "network" } };
      const res = await get("/auth/callback?code=abc123&next=%2Fstats");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("fails safe to /onboarding when no verified claims come back", async () => {
      getClaims.mockResolvedValue({ data: null, error: { message: "bad jwt" } });
      const res = await get("/auth/callback?code=abc123&next=%2Fstats");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("scopes the profile lookup to the verified user from getClaims", async () => {
      await get("/auth/callback?code=abc123");
      expect(profileQuery.table).toBe("profiles");
      expect(profileQuery.columns).toBe("onboarding_completed");
      expect(profileQuery.eq).toEqual(["id", "user-1"]);
    });

    it("never calls getSession — authorization reads verified claims only", async () => {
      await get("/auth/callback?code=abc123");
      expect(getClaims).toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
    });

    // A rejection is not the same as a returned { error }. The route awaits the
    // helper without a catch, so anything escaping it turns a SUCCESSFUL code
    // exchange into a 500 — the user authenticated, cookies set, and a server
    // error on screen. Strictly worse than an extra onboarding hop.
    it("redirects rather than throwing when getClaims rejects", async () => {
      getClaims.mockRejectedValue(new Error("jwks unreachable"));
      const res = await get("/auth/callback?code=abc123&next=%2Fstats");

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("redirects rather than throwing when the profile query rejects", async () => {
      profileRejects.current = true;
      const res = await get("/auth/callback?code=abc123&next=%2Fstats");

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });
  });
});

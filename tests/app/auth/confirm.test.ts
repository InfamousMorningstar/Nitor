import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/confirm/route";

const { verifyOtp, getClaims, getSession, profile, profileRejects } = vi.hoisted(
  () => ({
    verifyOtp: vi.fn(),
    getClaims: vi.fn(),
    // Present on the mock precisely so a test can prove the route never reaches
    // for it. getSession() is not an authorization primitive (S1).
    getSession: vi.fn(),
    profile: {
      current: { data: null, error: null } as {
        data: { onboarding_completed: unknown } | null;
        error: { message: string } | null;
      },
    },
    profileRejects: { current: false },
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { verifyOtp, getClaims, getSession },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            // Supabase can REJECT, not just resolve with { error }.
            if (profileRejects.current) throw new Error("socket hang up");
            return profile.current;
          },
        }),
      }),
    }),
  })),
}));

const ORIGIN = "http://localhost:3000";

/** `path` is the raw request-target, query string included. */
function get(path: string) {
  return GET(new NextRequest(`${ORIGIN}${path}`));
}

function onboarded() {
  profile.current = { data: { onboarding_completed: true }, error: null };
}

function notOnboarded() {
  profile.current = { data: { onboarding_completed: false }, error: null };
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtp.mockResolvedValue({ error: null });
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    onboarded();
    profileRejects.current = false;
  });

  it("redirects to /login?error=invalid_link without touching Supabase when token_hash is absent", async () => {
    const res = await get("/auth/confirm?type=signup");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=invalid_link`);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=invalid_link when type is absent", async () => {
    const res = await get("/auth/confirm?token_hash=th_1");
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=invalid_link`);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies a signup link and redirects an onboarded user to /today by default", async () => {
    const res = await get("/auth/confirm?token_hash=th_1&type=signup");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "th_1" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("honours a validated next for an onboarded user on non-recovery types", async () => {
    const res = await get(
      "/auth/confirm?token_hash=th_1&type=email&next=%2Fhabits",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/habits`);
  });

  it("falls back to /today for a hostile next", async () => {
    const res = await get(
      "/auth/confirm?token_hash=th_1&type=signup&next=//evil.com",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("keeps a percent-encoded next verbatim — never decoded into an authority", async () => {
    // Raw query value %2F%252F%252Fevil.com; searchParams.get() decodes it
    // once to "/%2F%2Fevil.com", which safeNext admits. The redirect must
    // carry that string untouched: a second decode would yield "//evil.com".
    const res = await get(
      "/auth/confirm?token_hash=th_1&type=signup&next=%2F%252F%252Fevil.com",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/%2F%2Fevil.com`);
  });

  it("redirects to /login?error=invalid_link when verification fails", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const res = await get("/auth/confirm?token_hash=stale&type=signup");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=invalid_link`);
  });

  describe("recovery", () => {
    it("sends recovery links to /reset-password, overriding next", async () => {
      const res = await get(
        "/auth/confirm?token_hash=th_1&type=recovery&next=%2Fhabits",
      );
      expect(res.headers.get("location")).toBe(`${ORIGIN}/reset-password`);
    });

    it("keeps recovery on /reset-password even for a user who never onboarded", async () => {
      // Someone resetting a password has one job. The onboarding gate still
      // catches them on the next navigation.
      notOnboarded();
      const res = await get("/auth/confirm?token_hash=th_1&type=recovery");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/reset-password`);
    });
  });

  describe("onboarding gate", () => {
    it("sends a first-time confirmed user to /onboarding", async () => {
      notOnboarded();
      const res = await get("/auth/confirm?token_hash=th_1&type=signup");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("sends an incomplete user to /onboarding even when the link asks for /today", async () => {
      notOnboarded();
      const res = await get(
        "/auth/confirm?token_hash=th_1&type=invite&next=%2Ftoday",
      );
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("treats a missing profile row as incomplete onboarding", async () => {
      profile.current = { data: null, error: null };
      const res = await get("/auth/confirm?token_hash=th_1&type=magiclink&next=%2Fstats");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("fails safe to /onboarding when the profile lookup errors", async () => {
      profile.current = { data: null, error: { message: "network" } };
      const res = await get("/auth/confirm?token_hash=th_1&type=signup&next=%2Fstats");
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("never calls getSession — authorization reads verified claims only", async () => {
      await get("/auth/confirm?token_hash=th_1&type=signup");
      expect(getClaims).toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
    });

    // A rejection is not a returned { error }. Anything escaping the helper
    // turns a SUCCESSFUL OTP verification into a 500.
    it("redirects rather than throwing when getClaims rejects", async () => {
      getClaims.mockRejectedValue(new Error("jwks unreachable"));
      const res = await get("/auth/confirm?token_hash=th_1&type=signup&next=%2Fstats");

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });

    it("redirects rather than throwing when the profile query rejects", async () => {
      profileRejects.current = true;
      const res = await get("/auth/confirm?token_hash=th_1&type=invite&next=%2Fstats");

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
    });
  });
});

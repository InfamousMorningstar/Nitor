import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

const ORIGIN = "http://localhost:3000";

/** `path` is the raw request-target, query string included. */
function get(path: string) {
  return GET(new NextRequest(`${ORIGIN}${path}`));
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("redirects to /login?error=missing_code without touching Supabase when code is absent", async () => {
    const res = await get("/auth/callback");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/login?error=missing_code`);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges the code and redirects to /today by default", async () => {
    const res = await get("/auth/callback?code=abc123");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("honours a validated next path, query string included", async () => {
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
});

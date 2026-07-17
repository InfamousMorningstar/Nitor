import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/confirm/route";

const { verifyOtp } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { verifyOtp },
  })),
}));

const ORIGIN = "http://localhost:3000";

/** `path` is the raw request-target, query string included. */
function get(path: string) {
  return GET(new NextRequest(`${ORIGIN}${path}`));
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
    verifyOtp.mockResolvedValue({ error: null });
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

  it("verifies a signup link and redirects to /today by default", async () => {
    const res = await get("/auth/confirm?token_hash=th_1&type=signup");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "th_1" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/today`);
  });

  it("honours a validated next for non-recovery types", async () => {
    const res = await get(
      "/auth/confirm?token_hash=th_1&type=email&next=%2Fhabits",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/habits`);
  });

  it("sends recovery links to /reset-password, overriding next", async () => {
    const res = await get(
      "/auth/confirm?token_hash=th_1&type=recovery&next=%2Fhabits",
    );
    expect(res.headers.get("location")).toBe(`${ORIGIN}/reset-password`);
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
});

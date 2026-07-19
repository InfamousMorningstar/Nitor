import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/account/route";

const { getClaims, getSession, signOut, deleteUser, getUserById, createAdminClient } =
  vi.hoisted(() => ({
    getClaims: vi.fn(),
    // Present on the mock precisely so a test can prove the route never reaches
    // for it. getSession() is not an authorization primitive (S1).
    getSession: vi.fn(),
    signOut: vi.fn(),
    deleteUser: vi.fn(),
    getUserById: vi.fn(),
    createAdminClient: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims, getSession, signOut },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClient.mockImplementation(() => ({
    auth: { admin: { deleteUser, getUserById } },
  })),
}));

const ORIGIN = "http://localhost:3000";

function del(body?: unknown) {
  return DELETE(
    new NextRequest(`${ORIGIN}/api/account`, {
      method: "DELETE",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

/** The shape supabase-js returns once a user is genuinely gone. */
function userIsGone() {
  getUserById.mockResolvedValue({
    data: { user: null },
    error: { message: "User not found" },
  });
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    deleteUser.mockResolvedValue({ data: { user: null }, error: null });
    signOut.mockResolvedValue({ error: null });
    userIsGone();
  });

  describe("authorization", () => {
    it("deletes the caller's own id from verified claims", async () => {
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(deleteUser).toHaveBeenCalledWith("user-1");
    });

    // The core guarantee: the endpoint is structurally incapable of deleting
    // anyone else, because no identifier is read from the request at all.
    it("ignores a user id supplied in the body and deletes the caller instead", async () => {
      const res = await del({ confirm: "delete", userId: "victim", id: "victim", sub: "victim" });

      expect(res.status).toBe(200);
      expect(deleteUser).toHaveBeenCalledWith("user-1");
      expect(deleteUser).not.toHaveBeenCalledWith("victim");
    });

    it("rejects an unauthenticated caller without deleting anything", async () => {
      getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(401);
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("rejects when claims carry no subject", async () => {
      getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(401);
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("never calls getSession — authorization reads verified claims only", async () => {
      await del({ confirm: "delete" });

      expect(getClaims).toHaveBeenCalled();
      expect(getSession).not.toHaveBeenCalled();
    });

    it("does not build the admin client before the caller is authenticated", async () => {
      getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
      await del({ confirm: "delete" });

      expect(createAdminClient).not.toHaveBeenCalled();
    });
  });

  describe("confirmation gesture", () => {
    it("refuses without the confirmation word", async () => {
      const res = await del({});

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "confirmation_required" });
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("refuses on a wrong confirmation word", async () => {
      const res = await del({ confirm: "yes" });

      expect(res.status).toBe(400);
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("refuses on a malformed body rather than throwing", async () => {
      const res = await DELETE(
        new NextRequest(`${ORIGIN}/api/account`, { method: "DELETE", body: "not json" }),
      );

      expect(res.status).toBe(400);
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("accepts the confirmation with surrounding whitespace and odd casing", async () => {
      const res = await del({ confirm: "  DELETE  " });

      expect(res.status).toBe(200);
      expect(deleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("failure is surfaced, never assumed away", () => {
    it("reports a failed deletion and leaves the session intact", async () => {
      deleteUser.mockResolvedValue({ data: null, error: { message: "admin api down" } });
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "delete_failed" });
      // Signing out here would strand a user whose account still exists.
      expect(signOut).not.toHaveBeenCalled();
    });

    // supabase-js returns errors rather than throwing, and a zero-row
    // operation is not an error — so absence of an error is not proof.
    it("reports failure when the user still exists after a clean delete call", async () => {
      getUserById.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "delete_unconfirmed" });
      expect(signOut).not.toHaveBeenCalled();
    });

    it("verifies the deletion by re-reading the same id it deleted", async () => {
      await del({ confirm: "delete" });

      expect(getUserById).toHaveBeenCalledWith("user-1");
    });

    it("still reports success when only the sign-out fails", async () => {
      // The account is already destroyed; refusing to acknowledge that would
      // be a worse lie than reporting the truth.
      signOut.mockResolvedValue({ error: { message: "cookie write failed" } });
      const res = await del({ confirm: "delete" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  it("signs the user out after a confirmed deletion", async () => {
    await del({ confirm: "delete" });

    expect(signOut).toHaveBeenCalled();
  });
});

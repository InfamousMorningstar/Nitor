import { describe, it, expect, vi } from "vitest";
import { pickRepository } from "./repositorySelection";
import type { HabitRepository } from "./repository";

const stub = (tag: string) => ({ tag }) as unknown as HabitRepository;

describe("pickRepository", () => {
  it("returns null while the session is loading — never the seeded mock", () => {
    // Handing back the mock here rendered five fabricated habits as the user's
    // own, accepted writes that were discarded on the swap, and let an export
    // capture demo data. There is no correct repository yet; say so.
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: true, userId: "u1", mock, makeSupabase })).toBeNull();
    expect(makeSupabase).not.toHaveBeenCalled();
  });

  it("returns null while loading even before a user id is known", () => {
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: true, userId: null, mock, makeSupabase })).toBeNull();
    expect(makeSupabase).not.toHaveBeenCalled();
  });

  it("returns the mock when there is no user", () => {
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: false, userId: null, mock, makeSupabase })).toBe(mock);
    expect(makeSupabase).not.toHaveBeenCalled();
  });

  it("builds the Supabase repo for an authenticated user", () => {
    const mock = stub("mock");
    const supa = stub("supabase");
    const makeSupabase = vi.fn(() => supa);
    expect(pickRepository({ loading: false, userId: "u1", mock, makeSupabase })).toBe(supa);
    expect(makeSupabase).toHaveBeenCalledTimes(1);
  });
});

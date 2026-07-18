import { describe, it, expect, vi } from "vitest";
import { pickRepository } from "./repositorySelection";
import type { HabitRepository } from "./repository";

const stub = (tag: string) => ({ tag }) as unknown as HabitRepository;

describe("pickRepository", () => {
  it("returns the mock while the session is loading", () => {
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: true, userId: "u1", mock, makeSupabase })).toBe(mock);
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

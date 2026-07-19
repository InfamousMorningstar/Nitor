import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { HabitRepository } from "@/data/repository";
import type { Habit, Log } from "@/domain/types";

const { useRepository } = vi.hoisted(() => ({ useRepository: vi.fn() }));
vi.mock("@/state/RepositoryProvider", () => ({ useRepository }));

const { useHabits } = await import("@/state/useHabits");

function habit(id: string): Habit {
  return {
    id,
    name: id,
    emoji: "*",
    color: "#000",
    category: "Personal",
    type: "boolean",
    targetValue: null,
    schedule: { kind: "daily" },
    strictness: "balanced",
    graceDaysPerWeek: 1,
    archived: false,
    createdAt: "2026-07-01",
  } as Habit;
}

/** A repository whose reads resolve immediately with the given habits. */
function repoWith(habits: Habit[], logs: Log[] = []): HabitRepository {
  return {
    listHabits: vi.fn(async () => habits),
    listLogs: vi.fn(async () => logs),
    logValue: vi.fn(async () => ({}) as Log),
    upsertHabit: vi.fn(async (h: Habit) => h),
    archiveHabit: vi.fn(async () => {}),
    deleteHabit: vi.fn(async () => {}),
  } as unknown as HabitRepository;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useHabits — session not yet resolved", () => {
  it("reads nothing and stays loading while the repository is null", async () => {
    // The repository is null until the session settles. Fetching against a
    // stand-in here is what rendered five seeded demo habits as the user's own.
    useRepository.mockReturnValue(null);

    const { result } = renderHook(() => useHabits());

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.habits).toEqual([]);
    expect(result.current.logs).toEqual([]);
  });

  it("writes nothing while the repository is null, and reports the failure", async () => {
    useRepository.mockReturnValue(null);
    const { result } = renderHook(() => useHabits());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.log({ habitId: "h1", date: "2026-07-18", value: true });
    });

    // A write accepted here would be silently discarded on the repository swap.
    expect(ok).toBe(false);
  });

  it("loads once the repository arrives", async () => {
    useRepository.mockReturnValue(null);
    const { result, rerender } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.loading).toBe(true));

    useRepository.mockReturnValue(repoWith([habit("real")]));
    rerender();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.habits.map((h) => h.id)).toEqual(["real"]);
  });
});

describe("useHabits — repository swaps", () => {
  it("does not let a previous repository's in-flight read paint after a swap", async () => {
    // The sign-out direction of this race is a data leak: user A's habits
    // resolving onto a signed-out screen on a shared machine.
    let releaseA: (habits: Habit[]) => void = () => {};
    const slowA = {
      listHabits: vi.fn(
        () => new Promise<Habit[]>((resolve) => { releaseA = resolve; }),
      ),
      listLogs: vi.fn(async () => [] as Log[]),
    } as unknown as HabitRepository;

    useRepository.mockReturnValue(slowA);
    const { result, rerender } = renderHook(() => useHabits());

    // Swap to a settled signed-out state before A's read comes back.
    useRepository.mockReturnValue(repoWith([habit("guest")]));
    rerender();
    await waitFor(() => expect(result.current.habits.map((h) => h.id)).toEqual(["guest"]));

    // A's read lands late, carrying the previous user's rows.
    await act(async () => {
      releaseA([habit("private-to-user-a")]);
    });

    expect(result.current.habits.map((h) => h.id)).toEqual(["guest"]);
  });

  it("clears the previous rows immediately on swap rather than showing them until the next read", async () => {
    useRepository.mockReturnValue(repoWith([habit("user-a")]));
    const { result, rerender } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.habits).toHaveLength(1));

    useRepository.mockReturnValue(null); // signing out
    rerender();

    expect(result.current.habits).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useHabits — failures are surfaced, not swallowed", () => {
  it("reports an error and stops loading when the read throws", async () => {
    // The repository throws on any PostgREST/RLS error. Unhandled, this left
    // loading stuck true and /today spinning forever.
    const failing = {
      listHabits: vi.fn(async () => {
        throw new Error("permission denied");
      }),
      listLogs: vi.fn(async () => [] as Log[]),
    } as unknown as HabitRepository;
    useRepository.mockReturnValue(failing);

    const { result } = renderHook(() => useHabits());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/couldn't load/i);
  });

  it("returns false and surfaces an error when a log write fails, without throwing", async () => {
    const failing = {
      ...repoWith([habit("h1")]),
      logValue: vi.fn(async () => {
        throw new Error("network down");
      }),
    } as unknown as HabitRepository;
    useRepository.mockReturnValue(failing);

    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      // Callers invoke this from event handlers as a floating promise, so a
      // rejection here would become an unhandled rejection the user never sees.
      ok = await result.current.log({ habitId: "h1", date: "2026-07-18", value: true });
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/couldn't save/i);
  });

  it("clears a previous error once a read succeeds", async () => {
    const flaky = {
      listHabits: vi
        .fn()
        .mockRejectedValueOnce(new Error("blip"))
        .mockResolvedValue([habit("h1")]),
      listLogs: vi.fn(async () => [] as Log[]),
    } as unknown as HabitRepository;
    useRepository.mockReturnValue(flaky);

    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.habits.map((h) => h.id)).toEqual(["h1"]);
  });
});

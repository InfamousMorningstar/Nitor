import { describe, it, expect, afterEach } from "vitest";
import { today } from "@/domain/dates";
import { computeStreak } from "@/domain/streaks";
import { weekOrderFrom } from "@/state/useDateSettings";
import type { Habit, Log } from "@/domain/types";

/**
 * These three settings were persisted, given full UI, and consumed by nobody.
 * In a date-heavy app that is not cosmetic: a 3am rollover still lost your
 * streak at midnight, and vacation mode paused nothing. Each test here asserts
 * the SETTING CHANGES THE ANSWER — a test that only proves the value round-trips
 * through the store would have passed the entire time they were dead.
 */

const REAL_NOW = Date.now;
afterEach(() => {
  Date.now = REAL_NOW;
  delete (globalThis as Record<string, unknown>).__NITOR_NOW__;
});

/** Pins wall-clock time to a local date/hour. */
function freeze(y: number, m: number, d: number, hour: number) {
  const fixed = new Date(y, m - 1, d, hour, 0, 0).getTime();
  Date.now = () => fixed;
}

function dailyHabit(createdAt: string): Habit {
  return {
    id: "h1",
    name: "Read",
    emoji: "*",
    color: "#000",
    category: "Personal",
    type: "boolean",
    targetValue: null,
    schedule: { kind: "daily" },
    strictness: "balanced",
    graceDaysPerWeek: 1,
    archived: false,
    createdAt,
  } as Habit;
}

function done(date: string): Log {
  return { id: `h1_${date}`, habitId: "h1", date, value: true, isGraceDay: false, isFreeze: false, createdAt: date } as Log;
}

describe("dayRolloverHour", () => {
  it("still calls 1am yesterday when the day rolls over at 3am", () => {
    freeze(2026, 7, 18, 1); // 1am on the 18th

    expect(today(0)).toBe("2026-07-18"); // plain calendar date
    expect(today(3)).toBe("2026-07-17"); // the user is still finishing the 17th
  });

  it("rolls to the new day once the rollover hour passes", () => {
    freeze(2026, 7, 18, 4); // 4am, past a 3am rollover

    expect(today(3)).toBe("2026-07-18");
  });

  it("leaves the calendar date alone at the default of midnight", () => {
    freeze(2026, 7, 18, 23);

    expect(today(0)).toBe("2026-07-18");
    expect(today()).toBe("2026-07-18");
  });

  it("does not shift a date that is already past the rollover", () => {
    freeze(2026, 7, 18, 12); // midday

    expect(today(3)).toBe("2026-07-18");
  });
});

describe("vacationMode", () => {
  const habit = dailyHabit("2026-07-10");
  // Kept through the 13th, then nothing logged 14th-18th.
  const logs = [done("2026-07-10"), done("2026-07-11"), done("2026-07-12"), done("2026-07-13")];

  it("breaks the streak on unlogged days when vacation is off", () => {
    expect(computeStreak(habit, logs, "2026-07-18").current).toBe(0);
  });

  it("holds the streak across days on or after the vacation start", () => {
    const streak = computeStreak(habit, logs, "2026-07-18", {
      vacationSince: "2026-07-14",
    });

    // 5 vacation days (14th-18th) plus the 4 genuinely kept days.
    expect(streak.current).toBe(9);
  });

  it("does not retroactively forgive misses from before it was switched on", () => {
    // Switched on only on the 17th: the 14th-16th are still real misses, so
    // walking back from the 18th stops there.
    const streak = computeStreak(habit, logs, "2026-07-18", {
      vacationSince: "2026-07-17",
    });

    expect(streak.current).toBe(2); // the 17th and 18th only
  });

  it("changes nothing when no vacation window is set", () => {
    const withNull = computeStreak(habit, logs, "2026-07-18", { vacationSince: null });
    const withoutOpts = computeStreak(habit, logs, "2026-07-18");

    expect(withNull).toEqual(withoutOpts);
  });

  it("counts vacation days toward momentum rather than against it", () => {
    const off = computeStreak(habit, logs, "2026-07-18").momentum;
    const on = computeStreak(habit, logs, "2026-07-18", {
      vacationSince: "2026-07-14",
    }).momentum;

    expect(on).toBeGreaterThan(off);
    expect(on).toBe(100);
  });
});

describe("weekStartsOn", () => {
  it("orders weekdays from Monday", () => {
    expect(weekOrderFrom(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("orders weekdays from Sunday", () => {
    expect(weekOrderFrom(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("always covers all seven days exactly once", () => {
    for (const start of [0, 1] as const) {
      expect([...weekOrderFrom(start)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });
});

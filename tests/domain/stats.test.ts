import { describe, it, expect } from "vitest";
import { dailyCompletion, weekdayRhythm } from "@/domain/stats";
import type { Habit, Log } from "@/domain/types";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "boolean", targetValue: null,
    schedule: { kind: "daily" }, strictness: "balanced",
    graceDaysPerWeek: 1, archived: false, createdAt: "2026-01-01",
    ...over,
  };
}

function log(habitId: string, date: string, value: number | boolean): Log {
  return { id: `${habitId}_${date}`, habitId, date, value, isGraceDay: false, createdAt: date };
}

// Fixture: 3 days, Mon 07-06 -> Wed 07-08.
// Habit A: daily schedule, complete every day.
// Habit B: weekdays Mon/Wed/Fri (1,3,5), complete on Monday only (incomplete Wed).
const habitA = habit({ id: "hA", schedule: { kind: "daily" } });
const habitB = habit({ id: "hB", schedule: { kind: "weekdays", weekdays: [1, 3, 5] } });
const habits = [habitA, habitB];

const logs: Log[] = [
  log("hA", "2026-07-06", true),
  log("hB", "2026-07-06", true),
  log("hA", "2026-07-07", true),
  // hB not scheduled on 07-07 (Tuesday)
  log("hA", "2026-07-08", true),
  log("hB", "2026-07-08", false), // scheduled but incomplete
];

describe("dailyCompletion", () => {
  it("counts scheduled/done habits per day across a known fixture", () => {
    const result = dailyCompletion(habits, logs, "2026-07-06", "2026-07-08");
    expect(result).toEqual([
      { date: "2026-07-06", done: 2, scheduled: 2 }, // Mon: both scheduled & complete
      { date: "2026-07-07", done: 1, scheduled: 1 }, // Tue: only A scheduled & complete
      { date: "2026-07-08", done: 1, scheduled: 2 }, // Wed: both scheduled, only A complete
    ]);
  });

  it("excludes archived habits", () => {
    const archived = habit({ id: "hC", archived: true });
    const result = dailyCompletion([archived], [], "2026-07-06", "2026-07-06");
    expect(result).toEqual([{ date: "2026-07-06", done: 0, scheduled: 0 }]);
  });
});

describe("weekdayRhythm", () => {
  it("aggregates completion rate per weekday over the range", () => {
    const result = weekdayRhythm(habits, logs, "2026-07-06", "2026-07-08");
    expect(result).toHaveLength(7);
    // weekday 1 = Monday: 2/2 = 100%
    expect(result.find((r) => r.weekday === 1)).toEqual({ weekday: 1, pct: 100 });
    // weekday 2 = Tuesday: 1/1 = 100%
    expect(result.find((r) => r.weekday === 2)).toEqual({ weekday: 2, pct: 100 });
    // weekday 3 = Wednesday: 1/2 = 50%
    expect(result.find((r) => r.weekday === 3)).toEqual({ weekday: 3, pct: 50 });
    // weekdays with no scheduled habits in range default to 0%
    expect(result.find((r) => r.weekday === 0)).toEqual({ weekday: 0, pct: 0 });
  });
});

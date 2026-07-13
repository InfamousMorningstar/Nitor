import { describe, it, expect } from "vitest";
import { isScheduledOn, isComplete, computeStreak } from "@/domain/streaks";
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

function log(date: string, value: number | boolean, isGraceDay = false): Log {
  return { id: date, habitId: "h1", date, value, isGraceDay, createdAt: date };
}

describe("isScheduledOn", () => {
  it("daily is always scheduled", () => {
    expect(isScheduledOn(habit(), "2026-07-13")).toBe(true);
  });
  it("weekdays respects the weekday list", () => {
    const h = habit({ schedule: { kind: "weekdays", weekdays: [1, 3, 5] } });
    expect(isScheduledOn(h, "2026-07-13")).toBe(true);  // Monday
    expect(isScheduledOn(h, "2026-07-14")).toBe(false); // Tuesday
  });
});

describe("isComplete", () => {
  it("boolean uses truthiness", () => {
    expect(isComplete(habit(), log("2026-07-13", true))).toBe(true);
    expect(isComplete(habit(), log("2026-07-13", false))).toBe(false);
  });
  it("count compares to target", () => {
    const h = habit({ type: "count", targetValue: 3 });
    expect(isComplete(h, log("2026-07-13", 3))).toBe(true);
    expect(isComplete(h, log("2026-07-13", 2))).toBe(false);
  });
  it("undefined log is incomplete", () => {
    expect(isComplete(habit(), undefined)).toBe(false);
  });
});

describe("computeStreak", () => {
  it("counts consecutive completed scheduled days", () => {
    const logs = [
      log("2026-07-11", true), log("2026-07-12", true), log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(3);
    expect(s.longest).toBeGreaterThanOrEqual(3);
  });

  it("a grace day does not break the current streak", () => {
    const logs = [
      log("2026-07-11", true),
      log("2026-07-12", false, true), // grace day
      log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(3);
  });

  it("a plain miss breaks the current streak but momentum is not zero", () => {
    const logs = [
      log("2026-07-09", true), log("2026-07-10", true),
      // 07-11 missed
      log("2026-07-12", true), log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(2);
    expect(s.momentum).toBeGreaterThan(0);
    expect(s.momentum).toBeLessThan(100);
  });
});

import { describe, it, expect } from "vitest";
import { isScheduledOn, isComplete, computeStreak } from "@/domain/streaks";
import { addDays as addDaysLocal, diffDays as diffDaysLocal } from "@/domain/dates";
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

  it("momentum samples scheduled days, not calendar days", () => {
    const h = habit({
      schedule: { kind: "weekdays", weekdays: [1, 3, 5] },
      createdAt: "2026-05-01",
    });
    const scheduledDates: string[] = [];
    for (let d = "2026-05-01"; diffDaysLocal(d, "2026-07-13") <= 0; d = addDaysLocal(d, 1)) {
      if (isScheduledOn(h, d)) scheduledDates.push(d);
    }
    const logs = scheduledDates.map((d) => log(d, true));
    const s1 = computeStreak(h, logs, "2026-07-13");
    expect(s1.momentum).toBe(100);

    const logsMinusLast = logs.filter((l) => l.date !== "2026-07-13");
    const s2 = computeStreak(h, logsMinusLast, "2026-07-13");
    expect(s2.momentum).toBe(93);
  });

  it("asOf-omitted uses max date with unsorted logs", () => {
    const h = habit();
    const logs = [
      log("2026-07-11", true),
      log("2026-07-13", true),
      log("2026-07-12", true),
    ];
    const s = computeStreak(h, logs);
    expect(s.current).toBe(3);
  });

  it("longest diverges from current", () => {
    const h = habit({ createdAt: "2026-07-01" });
    const logs = [
      log("2026-07-01", true),
      log("2026-07-02", true),
      log("2026-07-03", true),
      log("2026-07-04", true),
      // 07-05 missed
      log("2026-07-06", true),
      log("2026-07-07", true),
    ];
    const s = computeStreak(h, logs, "2026-07-07");
    expect(s.current).toBe(2);
    expect(s.longest).toBe(4);
  });
});

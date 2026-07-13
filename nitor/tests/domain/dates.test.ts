import { describe, it, expect, afterEach } from "vitest";
import { today, addDays, diffDays, weekdayOf, eachDayOfMonth } from "@/domain/dates";

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__NITOR_NOW__;
});

describe("dates", () => {
  it("today reads the override", () => {
    (globalThis as Record<string, unknown>).__NITOR_NOW__ = "2026-07-13";
    expect(today()).toBe("2026-07-13");
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffDays returns whole-day difference", () => {
    expect(diffDays("2026-07-13", "2026-07-10")).toBe(3);
    expect(diffDays("2026-07-10", "2026-07-13")).toBe(-3);
  });

  it("weekdayOf returns 0..6", () => {
    expect(weekdayOf("2026-07-13")).toBe(1); // Monday
  });

  it("eachDayOfMonth returns all days of the month", () => {
    const days = eachDayOfMonth(2026, 1); // February 2026 (28 days)
    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2026-02-01");
    expect(days[27]).toBe("2026-02-28");
  });
});

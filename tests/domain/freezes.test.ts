import { describe, it, expect } from "vitest";
import type { Habit, Log } from "@/domain/types";
import { freezeBank, rescuableMiss } from "@/domain/freezes";

const daily = (over: Partial<Habit> = {}): Habit => ({
  id: "h", name: "Read", emoji: "📖", color: "#fff", category: "mind",
  type: "boolean", targetValue: null, schedule: { kind: "daily" },
  strictness: "balanced", graceDaysPerWeek: 0, archived: false,
  createdAt: "2026-01-01", ...over,
});
const done = (date: string): Log => ({ id: date, habitId: "h", date, value: true, isGraceDay: false, createdAt: "" });
const freeze = (date: string): Log => ({ id: date, habitId: "h", date, value: false, isGraceDay: false, isFreeze: true, createdAt: "" });
const range = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDaysStr(start, i));
function addDaysStr(d: string, n: number) { const dt = new Date(d + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); }

describe("freezeBank", () => {
  it("grants +1 per 7 completed scheduled days, capped at 2", () => {
    const h = daily();
    expect(freezeBank(h, range("2026-01-01", 6).map(done), "2026-01-06")).toBe(0);
    expect(freezeBank(h, range("2026-01-01", 7).map(done), "2026-01-07")).toBe(1);
    expect(freezeBank(h, range("2026-01-01", 14).map(done), "2026-01-14")).toBe(2);
    expect(freezeBank(h, range("2026-01-01", 28).map(done), "2026-01-28")).toBe(2); // cap holds
  });
  it("resets the earn counter on an unprotected miss", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 6).map(done) /* miss Jan7 */, ...range("2026-01-08", 3).map(done)];
    expect(freezeBank(h, logs, "2026-01-10")).toBe(0);
  });
  it("decrements the bank when a freeze is spent", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 7).map(done), freeze("2026-01-08"), ...range("2026-01-09", 2).map(done)];
    expect(freezeBank(h, logs, "2026-01-10")).toBe(0); // earned 1, spent 1
  });
});

describe("rescuableMiss", () => {
  it("returns the isolated missed day when a freeze could save a ≥3 streak", () => {
    const h = daily();
    // done Jan1-5, miss Jan6, today Jan7
    const logs = range("2026-01-01", 5).map(done);
    expect(rescuableMiss(h, logs, "2026-01-07")).toBe("2026-01-06");
  });
  it("returns null for two consecutive misses", () => {
    const h = daily();
    const logs = range("2026-01-01", 5).map(done); // miss Jan6 AND Jan7, today Jan8
    expect(rescuableMiss(h, logs, "2026-01-08")).toBeNull();
  });
  it("returns null when the streak before the miss is under the threshold", () => {
    const h = daily();
    const logs = [done("2026-01-05")]; // only 1-day streak before miss Jan6
    expect(rescuableMiss(h, logs, "2026-01-07")).toBeNull();
  });
  it("returns null once the day is already protected", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 5).map(done), freeze("2026-01-06")];
    expect(rescuableMiss(h, logs, "2026-01-07")).toBeNull();
  });
});

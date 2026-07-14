import { describe, it, expect } from "vitest";
import { glowRate, moodFromGlow, evolutionProgress, activeDayCount, bestStreakDays } from "@/domain/pet";
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

describe("glowRate", () => {
  it("is 0 when nothing is scheduled", () => {
    expect(glowRate([], [], "2026-07-14")).toBe(0);
  });

  it("computes the trailing 7-day completion rate across active habits", () => {
    const h = habit({ id: "hA", createdAt: "2026-07-01" });
    // Complete 5 of the 7 days ending 2026-07-14 (07-08..07-14).
    const logs: Log[] = ["2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"].map((d) =>
      log("hA", d, true)
    );
    expect(glowRate([h], logs, "2026-07-14")).toBeCloseTo(5 / 7);
  });

  it("excludes archived habits", () => {
    const h = habit({ id: "hA", archived: true, createdAt: "2026-07-01" });
    const logs: Log[] = [log("hA", "2026-07-14", true)];
    expect(glowRate([h], logs, "2026-07-14")).toBe(0);
  });
});

describe("moodFromGlow", () => {
  it("buckets glow into moods", () => {
    expect(moodFromGlow(0.9)).toBe("radiant");
    expect(moodFromGlow(0.6)).toBe("glowing");
    expect(moodFromGlow(0.3)).toBe("idle");
    expect(moodFromGlow(0)).toBe("sleepy");
  });
});

describe("evolutionProgress", () => {
  it("starts at egg with 0 active days", () => {
    const p = evolutionProgress(0);
    expect(p.stage.key).toBe("egg");
    expect(p.next?.key).toBe("hatchling");
    expect(p.progress).toBe(0);
    expect(p.daysToNext).toBe(7);
  });

  it("reaches hatchling at 7 active days", () => {
    const p = evolutionProgress(7);
    expect(p.stage.key).toBe("hatchling");
    expect(p.next?.key).toBe("juvenile");
  });

  it("caps at radiant with no further stage", () => {
    const p = evolutionProgress(150);
    expect(p.stage.key).toBe("radiant");
    expect(p.next).toBeNull();
    expect(p.progress).toBe(1);
    expect(p.daysToNext).toBe(0);
  });
});

describe("activeDayCount", () => {
  it("counts distinct dates with at least one completion", () => {
    const h = habit({ id: "hA" });
    const logs: Log[] = [
      log("hA", "2026-07-01", true),
      log("hA", "2026-07-02", true),
      log("hA", "2026-07-02", true), // duplicate date, still counts once conceptually
      log("hA", "2026-07-03", false), // incomplete, doesn't count
    ];
    expect(activeDayCount([h], logs)).toBe(2);
  });
});

describe("bestStreakDays", () => {
  it("is the max longest streak across non-archived habits", () => {
    const h1 = habit({ id: "hA", createdAt: "2026-07-01" });
    const h2 = habit({ id: "hB", createdAt: "2026-07-01" });
    const logs: Log[] = [
      log("hA", "2026-07-01", true),
      log("hA", "2026-07-02", true),
      log("hA", "2026-07-03", true),
      log("hB", "2026-07-01", true),
    ];
    expect(bestStreakDays([h1, h2], logs)).toBe(3);
  });
});

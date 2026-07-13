import { describe, it, expect } from "vitest";
import { pearson, computeInsights } from "@/domain/insights";
import type { Habit, Log } from "@/domain/types";

describe("pearson", () => {
  it("is 1 for perfectly correlated series", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5);
  });
  it("is 0 for constant series", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe("computeInsights", () => {
  const habit: Habit = {
    id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "boolean", targetValue: null, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
  };

  it("returns a baseline story when data is sparse", () => {
    const logs: Log[] = [
      { id: "1", habitId: "h1", date: "2026-06-01", value: true, isGraceDay: false, createdAt: "2026-06-01T08:00:00Z" },
    ];
    const insights = computeInsights([habit], logs);
    expect(insights).toHaveLength(1);
    expect(insights[0].kind).toBe("story");
    expect(insights[0].narrative.toLowerCase()).toContain("baseline");
  });

  it("returns real insight cards when data is rich", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 20; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push({
        id: String(i), habitId: "h1", date: `2026-06-${day}`,
        value: i % 2 === 0, isGraceDay: false,
        createdAt: `2026-06-${day}T07:00:00Z`,
      });
    }
    const insights = computeInsights([habit], logs);
    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights.some((i) => i.kind === "best_time")).toBe(true);
  });

  it("leads with a deterministic weekly story card when data is rich", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 20; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push({
        id: String(i), habitId: "h1", date: `2026-06-${day}`,
        value: i % 2 === 0, isGraceDay: false,
        createdAt: `2026-06-${day}T07:00:00Z`,
      });
    }
    const insights = computeInsights([habit], logs);
    expect(insights[0].kind).toBe("story");
    expect(typeof insights[0].narrative).toBe("string");
    expect(insights[0].narrative.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.kind === "best_time")).toBe(true);
  });

  const hA: Habit = {
    id: "hA", name: "Meditate", emoji: "🧘", color: "#7C5CFF", category: "Mind",
    type: "boolean", targetValue: null, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
  };
  const hB: Habit = {
    id: "hB", name: "Journal", emoji: "📓", color: "#22C55E", category: "Mind",
    type: "boolean", targetValue: null, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
  };

  it("finds a perfect positive correlation for two identically-logged habits", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 12; i++) {
      const day = String(i + 1).padStart(2, "0");
      const value = i < 8;
      logs.push({
        id: `a${i}`, habitId: "hA", date: `2026-06-${day}`,
        value, isGraceDay: false, createdAt: `2026-06-${day}T07:00:00Z`,
      });
      logs.push({
        id: `b${i}`, habitId: "hB", date: `2026-06-${day}`,
        value, isGraceDay: false, createdAt: `2026-06-${day}T07:00:00Z`,
      });
    }
    const insights = computeInsights([hA, hB], logs);
    const corr = insights.find((i) => i.kind === "correlation");
    expect(corr).toBeDefined();
    expect(corr!.stat).toBe(1);
    expect(corr!.narrative).toContain("more likely");
  });

  it("does not let a third habit's unrelated dates bias the hA/hB correlation", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 12; i++) {
      const day = String(i + 1).padStart(2, "0");
      const value = i < 8;
      logs.push({
        id: `a${i}`, habitId: "hA", date: `2026-06-${day}`,
        value, isGraceDay: false, createdAt: `2026-06-${day}T07:00:00Z`,
      });
      logs.push({
        id: `b${i}`, habitId: "hB", date: `2026-06-${day}`,
        value, isGraceDay: false, createdAt: `2026-06-${day}T07:00:00Z`,
      });
    }
    const hC: Habit = {
      id: "hC", name: "Stretch", emoji: "🤸", color: "#F59E0B", category: "Body",
      type: "boolean", targetValue: null, schedule: { kind: "daily" },
      strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-07-01",
    };
    for (let i = 0; i < 6; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push({
        id: `c${i}`, habitId: "hC", date: `2026-07-${day}`,
        value: true, isGraceDay: false, createdAt: `2026-07-${day}T07:00:00Z`,
      });
    }
    const insights = computeInsights([hA, hB, hC], logs);
    const corr = insights.find((i) => i.kind === "correlation");
    expect(corr).toBeDefined();
    expect(corr!.stat).toBe(1);
  });
});

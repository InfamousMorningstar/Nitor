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
});

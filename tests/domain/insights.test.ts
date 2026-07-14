import { describe, it, expect } from "vitest";
import {
  pearson,
  computeInsights,
  correlationInsight,
  streakRisk,
  stackingSuggestion,
  monthlyRecap,
} from "@/domain/insights";
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

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "boolean", targetValue: null,
    schedule: { kind: "daily" }, strictness: "balanced",
    graceDaysPerWeek: 1, archived: false, createdAt: "2026-01-01",
    ...over,
  };
}

function boolLog(habitId: string, date: string, value: boolean): Log {
  return { id: `${habitId}_${date}`, habitId, date, value, isGraceDay: false, createdAt: `${date}T08:00:00Z` };
}

describe("correlationInsight", () => {
  it("returns a gentle not-enough-data note below the overlap threshold", () => {
    const hA = habit({ id: "hA", name: "Meditate" });
    const hB = habit({ id: "hB", name: "Journal" });
    const logs: Log[] = [];
    for (let i = 0; i < 8; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push(boolLog("hA", `2026-06-${day}`, true));
      logs.push(boolLog("hB", `2026-06-${day}`, true));
    }
    const result = correlationInsight([hA, hB], logs);
    expect(result.meaningful).toBe(false);
    expect(result.narrative.toLowerCase()).toContain("not enough data");
  });

  it("words a strong positive correlation without exposing a raw coefficient", () => {
    const hA = habit({ id: "hA", name: "Meditate" });
    const hB = habit({ id: "hB", name: "Journal" });
    const logs: Log[] = [];
    for (let i = 0; i < 16; i++) {
      const day = String(i + 1).padStart(2, "0");
      const value = i % 2 === 0;
      logs.push(boolLog("hA", `2026-06-${day}`, value));
      logs.push(boolLog("hB", `2026-06-${day}`, value));
    }
    const result = correlationInsight([hA, hB], logs);
    expect(result.meaningful).toBe(true);
    expect(result.narrative).toContain("more likely");
    expect(result.narrative).not.toMatch(/-?\d*\.?\d+/); // no raw coefficient in the sentence
  });

  it("words a strong negative correlation as habits crowding each other out", () => {
    const hA = habit({ id: "hA", name: "Late night TV" });
    const hB = habit({ id: "hB", name: "Early run" });
    const logs: Log[] = [];
    for (let i = 0; i < 16; i++) {
      const day = String(i + 1).padStart(2, "0");
      const value = i % 2 === 0;
      logs.push(boolLog("hA", `2026-06-${day}`, value));
      logs.push(boolLog("hB", `2026-06-${day}`, !value));
    }
    const result = correlationInsight([hA, hB], logs);
    expect(result.meaningful).toBe(true);
    expect(result.narrative.toLowerCase()).toContain("crowd");
  });
});

describe("streakRisk", () => {
  it("flags a habit that missed 2 of its last 3 scheduled Thursdays", () => {
    const atRisk = habit({
      id: "hRisk", name: "Call Mom",
      schedule: { kind: "weekdays", weekdays: [4] }, // Thursday
      createdAt: "2026-06-01",
    });
    const solid = habit({
      id: "hSolid", name: "Stretch",
      schedule: { kind: "daily" },
      createdAt: "2026-06-01",
    });

    const logs: Log[] = [
      // hRisk: only the oldest of the last 3 Thursdays (07-02) is complete;
      // 07-09 and 07-16 are missed.
      boolLog("hRisk", "2026-07-02", true),
      // hSolid: complete every day through the asOf date.
      boolLog("hSolid", "2026-07-14", true),
      boolLog("hSolid", "2026-07-15", true),
      boolLog("hSolid", "2026-07-16", true),
    ];

    const risk = streakRisk([atRisk, solid], logs, "2026-07-16");
    expect(risk).not.toBeNull();
    expect(risk!.habit.id).toBe("hRisk");
    expect(risk!.reason).toContain("2 of the last 3 Thursdays");
  });

  it("returns null when nothing is at risk", () => {
    const solid = habit({ id: "hSolid", name: "Stretch", createdAt: "2026-07-01" });
    const logs: Log[] = [
      boolLog("hSolid", "2026-07-14", true),
      boolLog("hSolid", "2026-07-15", true),
      boolLog("hSolid", "2026-07-16", true),
    ];
    expect(streakRisk([solid], logs, "2026-07-16")).toBeNull();
  });
});

describe("stackingSuggestion", () => {
  it("suggests stacking B after A when B follows A at a high rate over enough shared days", () => {
    const coffee = habit({ id: "coffee", name: "Coffee" });
    const journal = habit({ id: "journal", name: "Journal" });
    const walk = habit({ id: "walk", name: "Walk" });

    // 20 days. Coffee complete on the first 12. Journal complete on 10 of
    // those 12 (=> coffee->journal rate 10/12=83%) plus 5 more days where
    // coffee is NOT complete (=> journal->coffee rate only 10/15=67%, below
    // threshold, so the suggestion is directional, not a trivial reflection).
    const logs: Log[] = [];
    for (let i = 0; i < 20; i++) {
      const day = String(i + 1).padStart(2, "0");
      const date = `2026-06-${day}`;
      logs.push(boolLog("coffee", date, i < 12));
      logs.push(boolLog("journal", date, i < 10 || (i >= 12 && i < 17)));
      logs.push(boolLog("walk", date, i < 3)); // unrelated, too few days
    }

    const result = stackingSuggestion([coffee, journal, walk], logs);
    expect(result).not.toBeNull();
    expect(result!.after).toBe("Coffee");
    expect(result!.then).toBe("Journal");
    expect(result!.rate).toBe(83);
  });

  it("returns null when no pair meets the shared-day or rate threshold", () => {
    const coffee = habit({ id: "coffee", name: "Coffee" });
    const journal = habit({ id: "journal", name: "Journal" });
    const logs: Log[] = [];
    for (let i = 0; i < 12; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push(boolLog("coffee", `2026-06-${day}`, true));
      logs.push(boolLog("journal", `2026-06-${day}`, i < 5)); // only 5/12 — below 0.7 rate
    }
    expect(stackingSuggestion([coffee, journal], logs)).toBeNull();
  });
});

describe("monthlyRecap", () => {
  it("summarizes completion stats for the given month", () => {
    const h = habit({ id: "h1", name: "Read", createdAt: "2026-07-01" });
    const logs: Log[] = [
      boolLog("h1", "2026-07-01", true),
      boolLog("h1", "2026-07-02", true),
      boolLog("h1", "2026-07-03", false),
    ];
    const recap = monthlyRecap([h], logs, "2026-07");
    expect(recap.topHabit).toBe("Read");
    expect(recap.totalCompletions).toBe(2);
    expect(recap.bestStreak).toBeGreaterThanOrEqual(2);
    expect(recap.completionPct).toBeGreaterThan(0);
    expect(recap.completionPct).toBeLessThanOrEqual(100);
  });
});

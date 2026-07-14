import { describe, it, expect } from "vitest";
import type { Habit } from "@/domain/types";
import { editableDays, BACKDATE_DAYS } from "@/domain/backdate";

const daily: Habit = {
  id: "h", name: "R", emoji: "•", color: "#fff", category: "c", type: "boolean",
  targetValue: null, schedule: { kind: "daily" }, strictness: "balanced",
  graceDaysPerWeek: 0, archived: false, createdAt: "2026-01-01",
};

it("returns the last 7 days newest-first", () => {
  const days = editableDays(daily, "2026-02-10");
  expect(days).toHaveLength(BACKDATE_DAYS);
  expect(days[0].date).toBe("2026-02-10");
  expect(days[6].date).toBe("2026-02-04");
  expect(days.every((d) => d.scheduled)).toBe(true);
});

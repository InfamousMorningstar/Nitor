import { describe, it, expect } from "vitest";
import type { Habit } from "@/domain/types";
import { sortHabits, assignInitialOrder, reorder } from "@/domain/habitOrder";

const h = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, emoji: "•", color: "#fff", category: "c", type: "boolean",
  targetValue: null, schedule: { kind: "daily" }, strictness: "balanced",
  graceDaysPerWeek: 0, archived: false, createdAt: "2026-01-01", ...over,
});

it("sorts by order then createdAt", () => {
  const list = [h("b", { order: 1 }), h("a", { order: 0 }), h("c")];
  expect(sortHabits(list).map((x) => x.id)).toEqual(["a", "b", "c"]);
});
it("assigns initial order from sorted index", () => {
  const list = assignInitialOrder([h("a"), h("b")]);
  expect(list.map((x) => x.order)).toEqual([0, 1]);
});
it("reorders and rewrites contiguous order values", () => {
  const list = assignInitialOrder([h("a"), h("b"), h("c")]);
  const moved = reorder(list, "c", "a"); // move c to a's slot
  expect(moved.map((x) => x.id)).toEqual(["c", "a", "b"]);
  expect(moved.map((x) => x.order)).toEqual([0, 1, 2]);
});

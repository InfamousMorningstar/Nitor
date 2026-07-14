import type { Habit } from "@/domain/types";

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export function assignInitialOrder(habits: Habit[]): Habit[] {
  return sortHabits(habits).map((h, i) => ({ ...h, order: i }));
}

export function reorder(habits: Habit[], fromId: string, toId: string): Habit[] {
  const sorted = sortHabits(habits);
  const from = sorted.findIndex((h) => h.id === fromId);
  const to = sorted.findIndex((h) => h.id === toId);
  if (from < 0 || to < 0) return sorted.map((h, i) => ({ ...h, order: i }));
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  return sorted.map((h, i) => ({ ...h, order: i }));
}

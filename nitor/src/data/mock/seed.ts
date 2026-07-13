import type { Habit, Log } from "@/domain/types";
import { today, addDays, weekdayOf } from "@/domain/dates";

const HABITS: Habit[] = [
  { id: "h_read", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "duration", targetValue: 20, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_workout", name: "Workout", emoji: "🏋️", color: "#FF6B6B", category: "Health",
    type: "boolean", targetValue: null, schedule: { kind: "weekdays", weekdays: [1, 3, 5] },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_water", name: "Water", emoji: "💧", color: "#4EA8FF", category: "Health",
    type: "count", targetValue: 8, schedule: { kind: "daily" },
    strictness: "flexible", graceDaysPerWeek: 2, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_meditate", name: "Meditate", emoji: "🧘", color: "#37D39B", category: "Mind",
    type: "duration", targetValue: 10, schedule: { kind: "daily" },
    strictness: "strict", graceDaysPerWeek: 0, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_journal", name: "Journal", emoji: "✍️", color: "#F5A623", category: "Mind",
    type: "boolean", targetValue: null, schedule: { kind: "timesPerWeek", timesPerWeek: 4 },
    strictness: "flexible", graceDaysPerWeek: 2, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_pages", name: "Read pages", emoji: "📚", color: "#9B59F5", category: "Growth",
    type: "quantified", targetValue: 20, unit: "pages", schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_doomscroll", name: "No doomscrolling", emoji: "📵", color: "#E85D75", category: "Mind",
    type: "quit", targetValue: null, schedule: { kind: "daily" },
    strictness: "strict", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
];

// Deterministic pseudo-random so seed is stable across reloads.
function seeded(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function completionValue(h: Habit, roll: number): number | boolean {
  if (h.type === "boolean" || h.type === "quit") return roll > 0.25;
  if (h.type === "count" || h.type === "quantified")
    return roll > 0.2 ? (h.targetValue ?? 8) : Math.floor((h.targetValue ?? 8) * roll);
  return roll > 0.2 ? (h.targetValue ?? 20) : Math.floor((h.targetValue ?? 20) * roll);
}

export function buildSeed(): { habits: Habit[]; logs: Log[] } {
  const logs: Log[] = [];
  let counter = 0;
  for (const h of HABITS) {
    for (let i = 42; i >= 0; i--) {
      const date = addDays(today(), -i);
      // respect weekday schedule for the workout habit
      if (h.schedule.kind === "weekdays" && !(h.schedule.weekdays ?? []).includes(weekdayOf(date))) continue;
      const roll = seeded(counter++ + date.length);
      if (roll < 0.12) continue; // a genuine miss
      const isGrace = roll >= 0.12 && roll < 0.16 && h.graceDaysPerWeek > 0;
      const hour = 6 + Math.floor(seeded(counter) * 4); // mornings, for best-time insight
      logs.push({
        id: `${h.id}_${date}`,
        habitId: h.id,
        date,
        value: isGrace ? (h.type === "boolean" || h.type === "quit" ? false : 0) : completionValue(h, roll),
        isGraceDay: isGrace,
        createdAt: `${date}T${String(hour).padStart(2, "0")}:30:00Z`,
      });
    }
  }
  return { habits: HABITS.map((h) => ({ ...h })), logs };
}

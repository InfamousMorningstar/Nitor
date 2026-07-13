import type { HabitType, Schedule } from "@/domain/types";

/**
 * Proven habit starting points shown as a gallery on the Habits page.
 * Not a full Habit — templates carry no id/createdAt/archived; the
 * consumer (HabitDrawer/HabitForm) builds a fresh Habit from these when
 * a template is chosen.
 */
export interface HabitTemplate {
  name: string;
  emoji: string;
  color: string;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  schedule: Schedule;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    name: "Read 20 pages",
    emoji: "📖",
    color: "#F5B841",
    type: "quantified",
    targetValue: 20,
    unit: "pages",
    schedule: { kind: "daily" },
  },
  {
    name: "Meditate 10 minutes",
    emoji: "🧘",
    color: "#C69CF0",
    type: "duration",
    targetValue: 10,
    schedule: { kind: "daily" },
  },
  {
    name: "Drink 8 glasses of water",
    emoji: "💧",
    color: "#57C6E0",
    type: "count",
    targetValue: 8,
    schedule: { kind: "daily" },
  },
  {
    name: "No sugar",
    emoji: "🚫",
    color: "#FF8E6B",
    type: "quit",
    schedule: { kind: "daily" },
  },
  {
    name: "Daily walk",
    emoji: "🚶",
    color: "#8FD16A",
    type: "duration",
    targetValue: 30,
    schedule: { kind: "daily" },
  },
  {
    name: "Journal",
    emoji: "✍️",
    color: "#5AD1B4",
    type: "boolean",
    schedule: { kind: "weekdays", weekdays: [1, 2, 3, 4, 5] },
  },
];

export type HabitType = "duration" | "boolean" | "count" | "quantified" | "quit";
export type ScheduleKind = "daily" | "weekdays" | "timesPerWeek" | "everyNDays" | "monthly";
export type Strictness = "strict" | "balanced" | "flexible";

export interface Schedule {
  kind: ScheduleKind;
  /** 0=Sun..6=Sat; used when kind === "weekdays" */
  weekdays?: number[];
  /** used when kind === "timesPerWeek" */
  timesPerWeek?: number;
  /** used when kind === "everyNDays"; scheduled every N days from habit.startDate ?? createdAt */
  everyNDays?: number;
  /** 1-31; used when kind === "monthly" */
  monthlyDay?: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex, e.g. "#7C5CFF"
  category: string;
  type: HabitType;
  /** minutes (duration) or count target; null for boolean */
  targetValue: number | null;
  schedule: Schedule;
  strictness: Strictness;
  graceDaysPerWeek: number;
  archived: boolean;
  createdAt: string; // YYYY-MM-DD
  /** label for quantified habits, e.g. "pages" */
  unit?: string;
  /** YYYY-MM-DD; defaults to createdAt when absent */
  startDate?: string;
}

export interface Log {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  /** minutes done, count done, or boolean completion */
  value: number | boolean;
  note?: string;
  isGraceDay: boolean;
  /** true when this day was rescued by spending an earned streak-freeze */
  isFreeze?: boolean;
  createdAt: string; // ISO
}

export interface Streak {
  current: number;
  longest: number;
  /** 0..100 forgiving momentum score */
  momentum: number;
}

export type InsightKind = "correlation" | "best_time" | "trend" | "story";

export interface Insight {
  id: string;
  habitId?: string;
  kind: InsightKind;
  /** the raw computed statistic (correlation coeff, hour, %, etc.) */
  stat: number;
  /** short machine-y label, e.g. "Sleep ↔ Workout" */
  label: string;
  /** human sentence (mocked in Phase 1) */
  narrative: string;
}

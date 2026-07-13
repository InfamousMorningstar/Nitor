import type { Habit, Log } from "@/domain/types";
import { isComplete, isScheduledOn } from "@/domain/streaks";
import { addDays, diffDays, today, weekdayOf } from "@/domain/dates";

export interface DailyCompletion {
  date: string;
  done: number;
  scheduled: number;
}

export interface MomentumPoint {
  date: string;
  pct: number;
}

export interface WeekdayPoint {
  weekday: number; // 0=Sun..6=Sat
  pct: number;
}

/** Per date in [from, to] (inclusive), how many non-archived habits were scheduled and completed. */
export function dailyCompletion(habits: Habit[], logs: Log[], from: string, to: string): DailyCompletion[] {
  const active = habits.filter((h) => !h.archived);
  const byHabitDate = new Map<string, Log>();
  for (const l of logs) byHabitDate.set(`${l.habitId}|${l.date}`, l);

  const result: DailyCompletion[] = [];
  for (let d = from; diffDays(d, to) <= 0; d = addDays(d, 1)) {
    let scheduled = 0;
    let done = 0;
    for (const h of active) {
      if (!isScheduledOn(h, d)) continue;
      scheduled++;
      if (isComplete(h, byHabitDate.get(`${h.id}|${d}`))) done++;
    }
    result.push({ date: d, done, scheduled });
  }
  return result;
}

const MOMENTUM_WINDOW_DAYS = 30;

/**
 * For each of the last `days` days (ending today), a rolling completion %
 * over a trailing 30-day window (done/scheduled across all habits).
 */
export function momentumSeries(habits: Habit[], logs: Log[], days: number): MomentumPoint[] {
  if (days <= 0) return [];
  const end = today();
  const seriesStart = addDays(end, -(days - 1));
  const dailyStart = addDays(seriesStart, -(MOMENTUM_WINDOW_DAYS - 1));
  const daily = dailyCompletion(habits, logs, dailyStart, end);
  const byDate = new Map(daily.map((d) => [d.date, d]));

  const result: MomentumPoint[] = [];
  let windowDone = 0;
  let windowScheduled = 0;
  const queue: DailyCompletion[] = [];

  // Prime the window with days strictly before seriesStart so the first
  // point already has a full trailing 30-day view.
  for (let d = dailyStart; diffDays(d, seriesStart) < 0; d = addDays(d, 1)) {
    const entry = byDate.get(d) ?? { date: d, done: 0, scheduled: 0 };
    queue.push(entry);
    windowDone += entry.done;
    windowScheduled += entry.scheduled;
  }

  for (let d = seriesStart; diffDays(d, end) <= 0; d = addDays(d, 1)) {
    const entry = byDate.get(d) ?? { date: d, done: 0, scheduled: 0 };
    queue.push(entry);
    windowDone += entry.done;
    windowScheduled += entry.scheduled;

    if (queue.length > MOMENTUM_WINDOW_DAYS) {
      const dropped = queue.shift()!;
      windowDone -= dropped.done;
      windowScheduled -= dropped.scheduled;
    }

    result.push({
      date: d,
      pct: windowScheduled === 0 ? 0 : Math.round((100 * windowDone) / windowScheduled),
    });
  }
  return result;
}

/** Completion rate per weekday (0=Sun..6=Sat), aggregated across [from, to]. */
export function weekdayRhythm(habits: Habit[], logs: Log[], from: string, to: string): WeekdayPoint[] {
  const daily = dailyCompletion(habits, logs, from, to);
  const totals = Array.from({ length: 7 }, () => ({ done: 0, scheduled: 0 }));
  for (const d of daily) {
    const wd = weekdayOf(d.date);
    totals[wd].done += d.done;
    totals[wd].scheduled += d.scheduled;
  }
  return totals.map((t, weekday) => ({
    weekday,
    pct: t.scheduled === 0 ? 0 : Math.round((100 * t.done) / t.scheduled),
  }));
}

/** Per-day 0/1 completion for a habit over the last `days` days (ending today). */
export function habitSparkline(habit: Habit, logs: Log[], days: number): number[] {
  if (days <= 0) return [];
  const end = today();
  const start = addDays(end, -(days - 1));
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l]));

  const result: number[] = [];
  for (let d = start; diffDays(d, end) <= 0; d = addDays(d, 1)) {
    result.push(isComplete(habit, byDate.get(d)) ? 1 : 0);
  }
  return result;
}

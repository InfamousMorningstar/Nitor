import type { Habit, Log, Streak } from "@/domain/types";
import { addDays, diffDays, weekdayOf } from "@/domain/dates";

export function isScheduledOn(habit: Habit, date: string): boolean {
  const s = habit.schedule;
  if (s.kind === "daily") return true;
  if (s.kind === "weekdays") return (s.weekdays ?? []).includes(weekdayOf(date));
  // timesPerWeek: treat every day as an opportunity (flexible)
  return true;
}

export function isComplete(habit: Habit, log: Log | undefined): boolean {
  if (!log) return false;
  if (habit.type === "boolean") return Boolean(log.value);
  const done = typeof log.value === "number" ? log.value : log.value ? 1 : 0;
  return done >= (habit.targetValue ?? 1);
}

function logByDate(logs: Log[]): Map<string, Log> {
  const m = new Map<string, Log>();
  for (const l of logs) m.set(l.date, l);
  return m;
}

export function computeStreak(habit: Habit, logs: Log[], asOf?: string): Streak {
  const byDate = logByDate(logs);
  const end = asOf ?? (logs.length ? logs[logs.length - 1].date : habit.createdAt);

  // Current streak: walk backward over scheduled days.
  let current = 0;
  let cursor = end;
  for (let guard = 0; guard < 3650; guard++) {
    if (diffDays(cursor, habit.createdAt) < 0) break;
    if (isScheduledOn(habit, cursor)) {
      const l = byDate.get(cursor);
      if (isComplete(habit, l) || l?.isGraceDay) current++;
      else break;
    }
    cursor = addDays(cursor, -1);
  }

  // Longest streak: scan all scheduled days from createdAt..end.
  let longest = 0;
  let run = 0;
  for (let d = habit.createdAt; diffDays(end, d) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    const l = byDate.get(d);
    if (isComplete(habit, l) || l?.isGraceDay) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  // Momentum: forgiving 14-scheduled-day fill rate.
  let scheduled = 0;
  let good = 0;
  for (let i = 0; i < 14; i++) {
    const d = addDays(end, -i);
    if (diffDays(d, habit.createdAt) < 0) break;
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    const l = byDate.get(d);
    if (isComplete(habit, l) || l?.isGraceDay) good++;
  }
  const momentum = scheduled === 0 ? 0 : Math.round((100 * good) / scheduled);

  return { current, longest, momentum };
}

import type { Habit, Log, Streak } from "@/domain/types";
import { addDays, diffDays, weekdayOf } from "@/domain/dates";

export function isScheduledOn(habit: Habit, date: string): boolean {
  const s = habit.schedule;
  if (s.kind === "daily") return true;
  if (s.kind === "weekdays") return (s.weekdays ?? []).includes(weekdayOf(date));
  if (s.kind === "everyNDays") {
    const n = s.everyNDays;
    if (!n || n < 1) return false;
    const start = habit.startDate ?? habit.createdAt;
    const delta = diffDays(date, start);
    return delta >= 0 && delta % n === 0;
  }
  if (s.kind === "monthly") {
    const day = s.monthlyDay;
    if (!day || day < 1 || day > 31) return false;
    const dayOfMonth = Number(date.split("-")[2]);
    return dayOfMonth === day;
  }
  // timesPerWeek: treat every day as an opportunity (flexible)
  return true;
}

export function isComplete(habit: Habit, log: Log | undefined): boolean {
  if (!log) return false;
  if (habit.type === "boolean" || habit.type === "quit") return Boolean(log.value);
  const done = typeof log.value === "number" ? log.value : log.value ? 1 : 0;
  return done >= (habit.targetValue ?? 1);
}

function logByDate(logs: Log[]): Map<string, Log> {
  const m = new Map<string, Log>();
  for (const l of logs) m.set(l.date, l);
  return m;
}

export interface StreakOptions {
  /**
   * The date vacation mode was switched on, or null. Scheduled days on or
   * after it count as protected rather than missed.
   *
   * A date rather than a boolean, because a bare "vacation is on" flag cannot
   * say WHEN it became true, and computeStreak walks history — it would either
   * forgive every past miss or none of them. Anchoring to the switch-on date
   * forgives exactly the days the user was actually away, and turning vacation
   * off stops the protection without retroactively rewriting anything.
   */
  vacationSince?: string | null;
}

/** Whether a scheduled day counts as kept: logged, graced, frozen, or on vacation. */
function isProtected(
  habit: Habit,
  log: Log | undefined,
  date: string,
  vacationSince: string | null | undefined,
): boolean {
  if (isComplete(habit, log) || log?.isGraceDay || log?.isFreeze) return true;
  return Boolean(vacationSince) && diffDays(date, vacationSince as string) >= 0;
}

export function computeStreak(
  habit: Habit,
  logs: Log[],
  asOf?: string,
  opts: StreakOptions = {},
): Streak {
  const { vacationSince } = opts;
  const byDate = logByDate(logs);
  const end =
    asOf ??
    (logs.length
      ? logs.reduce((latest, l) => (diffDays(l.date, latest) > 0 ? l.date : latest), logs[0].date)
      : habit.createdAt);

  // Current streak: walk backward over scheduled days.
  let current = 0;
  let cursor = end;
  for (let guard = 0; guard < 3650; guard++) {
    if (diffDays(cursor, habit.createdAt) < 0) break;
    if (isScheduledOn(habit, cursor)) {
      const l = byDate.get(cursor);
      if (isProtected(habit, l, cursor, vacationSince)) current++;
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
    if (isProtected(habit, l, d, vacationSince)) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  // Momentum: forgiving fill rate over the last 14 SCHEDULED days (not calendar days).
  let scheduled = 0;
  let good = 0;
  let momentumCursor = end;
  for (let guard = 0; guard < 3650 && scheduled < 14; guard++) {
    if (diffDays(momentumCursor, habit.createdAt) < 0) break;
    if (isScheduledOn(habit, momentumCursor)) {
      scheduled++;
      const l = byDate.get(momentumCursor);
      if (isProtected(habit, l, momentumCursor, vacationSince)) good++;
    }
    momentumCursor = addDays(momentumCursor, -1);
  }
  const momentum = scheduled === 0 ? 0 : Math.round((100 * good) / scheduled);

  return { current, longest, momentum };
}

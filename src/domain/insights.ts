import type { Habit, Log, Insight } from "@/domain/types";
import { isComplete, isScheduledOn, computeStreak } from "@/domain/streaks";
import { today, addDays, diffDays, weekdayOf, eachDayOfMonth } from "@/domain/dates";

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const mean = (a: number[]) => a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function bestCompletionHourBucket(logs: Log[]): number {
  const buckets = new Array(24).fill(0);
  let any = false;
  for (const l of logs) {
    const hour = new Date(l.createdAt).getUTCHours();
    if (!Number.isNaN(hour)) { buckets[hour]++; any = true; }
  }
  if (!any) return -1;
  let best = 0;
  for (let h = 1; h < 24; h++) if (buckets[h] > buckets[best]) best = h;
  return best;
}

const MIN_LOGS = 10;

export function computeInsights(habits: Habit[], logs: Log[]): Insight[] {
  if (logs.length < MIN_LOGS) {
    return [{
      id: "story-baseline",
      kind: "story",
      stat: logs.length,
      label: "Building your baseline",
      narrative:
        "Keep logging for a couple of weeks — Nitor is building your baseline. " +
        "Once there's enough signal, your weekly story and correlations unlock here.",
    }];
  }

  const insights: Insight[] = [];

  const hour = bestCompletionHourBucket(logs);
  if (hour >= 0) {
    const window = `${hour}:00–${(hour + 2) % 24}:00`;
    insights.push({
      id: "best-time",
      kind: "best_time",
      stat: hour,
      label: "Best completion window",
      narrative: `You complete habits most often around ${window}. Protecting that window keeps momentum high.`,
    });
  }

  // Pairwise correlation across the two most-logged habits (mock narrative).
  const byHabit = new Map<string, Log[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push(l);
    byHabit.set(l.habitId, arr);
  }
  const ranked = [...byHabit.entries()].sort((a, b) => b[1].length - a[1].length);
  let topTwoSentence = "";
  if (ranked.length >= 2) {
    const [aId] = ranked[0];
    const [bId] = ranked[1];
    const a = habits.find((h) => h.id === aId);
    const b = habits.find((h) => h.id === bId);
    if (a && b) {
      const xs: number[] = [], ys: number[] = [];
      const aByDate = new Map(byHabit.get(aId)!.map((l) => [l.date, l]));
      const bByDate = new Map(byHabit.get(bId)!.map((l) => [l.date, l]));
      const dates = new Set<string>([...aByDate.keys(), ...bByDate.keys()]);
      for (const d of dates) {
        xs.push(isComplete(a, aByDate.get(d)) ? 1 : 0);
        ys.push(isComplete(b, bByDate.get(d)) ? 1 : 0);
      }
      const r = pearson(xs, ys);
      insights.push({
        id: "corr-top2",
        kind: "correlation",
        stat: Number(r.toFixed(2)),
        label: `${a.name} ↔ ${b.name}`,
        narrative:
          r >= 0.2
            ? `On days you do ${a.name}, you're noticeably more likely to do ${b.name}. Stacking them could compound.`
            : `${a.name} and ${b.name} don't move together much yet — they're independent habits for now.`,
      });
      topTwoSentence =
        r >= 0.2
          ? ` ${a.name} and ${b.name} tend to rise together.`
          : ` ${a.name} and ${b.name} are moving independently for now.`;
    }
  }

  // Deterministic weekly story (Phase 1 mock; Phase 2 replaces this with a real Claude narrative).
  let topHabit: Habit | undefined;
  let topMomentum = 0;
  for (const h of habits) {
    const hLogs = logs.filter((l) => l.habitId === h.id);
    const momentum = computeStreak(h, hLogs, today()).momentum;
    if (!topHabit || momentum > topMomentum) {
      topHabit = h;
      topMomentum = momentum;
    }
  }
  const topName = topHabit?.name ?? "your habits";
  let narrative = `This week, ${topName} is your brightest habit at ${topMomentum}% momentum.${hour >= 0 ? ` You show up most around ${hour}:00 — protect that window.` : ""}`;
  narrative += topTwoSentence;

  insights.unshift({
    id: "story-weekly",
    kind: "story",
    stat: topMomentum,
    label: "This week",
    narrative,
  });

  return insights;
}

const CORR_MIN_OVERLAP_DAYS = 14;
const CORR_MIN_ABS_R = 0.3;
const NOT_ENOUGH_DATA = "Not enough data yet — check back in a week.";

export interface CorrelationInsight {
  narrative: string;
  /** true only when the gating thresholds were met and the narrative names real habits. */
  meaningful: boolean;
}

/**
 * Worded correlation between the two most-logged habits, gated to avoid
 * noise: requires >=14 overlapping logged days and |r|>=0.3. The numeric
 * coefficient is NEVER exposed in the narrative — only translated to words.
 */
export function correlationInsight(habits: Habit[], logs: Log[]): CorrelationInsight {
  const byHabit = new Map<string, Log[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push(l);
    byHabit.set(l.habitId, arr);
  }
  const ranked = [...byHabit.entries()].sort((a, b) => b[1].length - a[1].length);
  if (ranked.length < 2) return { narrative: NOT_ENOUGH_DATA, meaningful: false };

  const [aId, aLogs] = ranked[0];
  const [bId, bLogs] = ranked[1];
  const a = habits.find((h) => h.id === aId);
  const b = habits.find((h) => h.id === bId);
  if (!a || !b) return { narrative: NOT_ENOUGH_DATA, meaningful: false };

  const aByDate = new Map(aLogs.map((l) => [l.date, l]));
  const bByDate = new Map(bLogs.map((l) => [l.date, l]));
  const overlap = [...aByDate.keys()].filter((d) => bByDate.has(d));
  if (overlap.length < CORR_MIN_OVERLAP_DAYS) return { narrative: NOT_ENOUGH_DATA, meaningful: false };

  const xs = overlap.map((d) => (isComplete(a, aByDate.get(d)) ? 1 : 0));
  const ys = overlap.map((d) => (isComplete(b, bByDate.get(d)) ? 1 : 0));
  const r = pearson(xs, ys);
  if (Math.abs(r) < CORR_MIN_ABS_R) return { narrative: NOT_ENOUGH_DATA, meaningful: false };

  const narrative =
    r > 0
      ? `On days you do ${a.name}, you're much more likely to also do ${b.name}.`
      : `${a.name} and ${b.name} tend to crowd each other out — they rarely both happen the same day.`;

  return { narrative, meaningful: true };
}

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export interface StreakRiskResult {
  habit: Habit;
  reason: string;
}

/**
 * Finds the habit most at risk of falling off: one that has missed >=2 of
 * its last 3 scheduled occurrences (up to and including `asOf`), or —
 * failing that — the habit whose momentum has dropped the most week over
 * week. Returns null when nothing looks at risk.
 */
export function streakRisk(habits: Habit[], logs: Log[], asOf: string): StreakRiskResult | null {
  let best: { habit: Habit; reason: string; missed: number } | null = null;

  for (const h of habits) {
    if (h.archived) continue;
    const hLogs = logs.filter((l) => l.habitId === h.id);
    const byDate = new Map(hLogs.map((l) => [l.date, l]));

    const occurrences: { date: string; complete: boolean }[] = [];
    let cursor = asOf;
    for (let guard = 0; guard < 3650 && occurrences.length < 3; guard++) {
      if (diffDays(cursor, h.createdAt) < 0) break;
      if (isScheduledOn(h, cursor)) {
        const l = byDate.get(cursor);
        occurrences.push({ date: cursor, complete: isComplete(h, l) || Boolean(l?.isGraceDay) || Boolean(l?.isFreeze) });
      }
      cursor = addDays(cursor, -1);
    }
    if (occurrences.length < 3) continue;

    const missed = occurrences.filter((o) => !o.complete);
    if (missed.length < 2) continue;
    if (best && missed.length <= best.missed) continue;

    const weekdays = occurrences.map((o) => weekdayOf(o.date));
    const sameWeekday = weekdays.every((w) => w === weekdays[0]);
    const reason = sameWeekday
      ? `you've missed ${missed.length} of the last ${occurrences.length} ${WEEKDAY_NAMES[weekdays[0]]}s`
      : `you've missed ${missed.length} of your last ${occurrences.length} scheduled days`;

    best = { habit: h, reason, missed: missed.length };
  }

  if (best) return { habit: best.habit, reason: best.reason };

  // Fallback: the habit whose momentum dropped the most over the last week.
  let worstDrop: { habit: Habit; reason: string; drop: number } | null = null;
  for (const h of habits) {
    if (h.archived) continue;
    const hLogs = logs.filter((l) => l.habitId === h.id);
    const now = computeStreak(h, hLogs, asOf).momentum;
    const weekAgo = computeStreak(h, hLogs, addDays(asOf, -7)).momentum;
    const drop = weekAgo - now;
    if (drop >= 20 && (!worstDrop || drop > worstDrop.drop)) {
      worstDrop = {
        habit: h,
        reason: `your momentum has slipped from ${weekAgo}% to ${now}% this week`,
        drop,
      };
    }
  }
  return worstDrop ? { habit: worstDrop.habit, reason: worstDrop.reason } : null;
}

const STACK_MIN_SHARED_DAYS = 10;
const STACK_MIN_RATE = 0.7;

export interface StackingSuggestion {
  after: string;
  then: string;
  /** integer percent, 0-100 */
  rate: number;
}

/**
 * Finds a pair of habits where, on days habit A is completed, habit B is
 * also completed at a high rate (>=0.7) over >=10 days A was completed.
 * Returns the strongest such pair, or null if none qualifies.
 */
export function stackingSuggestion(habits: Habit[], logs: Log[]): StackingSuggestion | null {
  const byHabit = new Map<string, Log[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push(l);
    byHabit.set(l.habitId, arr);
  }

  let best: StackingSuggestion | null = null;

  for (const a of habits) {
    const aLogs = byHabit.get(a.id) ?? [];
    const aCompletedDates = aLogs.filter((l) => isComplete(a, l)).map((l) => l.date);
    if (aCompletedDates.length < STACK_MIN_SHARED_DAYS) continue;

    for (const b of habits) {
      if (b.id === a.id) continue;
      const bLogs = byHabit.get(b.id) ?? [];
      const bByDate = new Map(bLogs.map((l) => [l.date, l]));

      const bCompleted = aCompletedDates.filter((d) => isComplete(b, bByDate.get(d))).length;
      const rate = bCompleted / aCompletedDates.length;
      if (rate >= STACK_MIN_RATE && (!best || rate > best.rate / 100)) {
        best = { after: a.name, then: b.name, rate: Math.round(rate * 100) };
      }
    }
  }

  return best;
}

export interface MonthlyRecap {
  /** 0-100 */
  completionPct: number;
  bestStreak: number;
  topHabit: string | null;
  totalCompletions: number;
}

function longestRunInRange(habit: Habit, logs: Log[], from: string, to: string): number {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  let longest = 0;
  let run = 0;
  for (let d = from; diffDays(to, d) >= 0; d = addDays(d, 1)) {
    if (diffDays(d, habit.createdAt) < 0) continue;
    if (!isScheduledOn(habit, d)) continue;
    const l = byDate.get(d);
    if (isComplete(habit, l) || l?.isGraceDay || l?.isFreeze) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

/**
 * Summary stats for a given calendar month (format "YYYY-MM"), across all
 * non-archived habits. For the current (in-progress) month, only days up
 * to today count — future days aren't penalized as misses.
 */
export function monthlyRecap(habits: Habit[], logs: Log[], month: string): MonthlyRecap {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex0 = Number(monthStr) - 1;
  const now = today();
  const days = eachDayOfMonth(year, monthIndex0).filter((d) => diffDays(d, now) <= 0);
  if (days.length === 0) {
    return { completionPct: 0, bestStreak: 0, topHabit: null, totalCompletions: 0 };
  }
  const monthStart = days[0];
  const monthEnd = days[days.length - 1];

  const activeHabits = habits.filter((h) => !h.archived);

  let scheduled = 0;
  let completed = 0;
  let totalCompletions = 0;
  let bestStreak = 0;
  let topHabit: Habit | null = null;
  let topHabitCompletions = -1;

  for (const h of activeHabits) {
    const hLogs = logs.filter((l) => l.habitId === h.id);
    const byDate = new Map(hLogs.map((l) => [l.date, l]));
    let habitCompletions = 0;

    for (const d of days) {
      if (diffDays(d, h.createdAt) < 0) continue;
      if (!isScheduledOn(h, d)) continue;
      scheduled++;
      const l = byDate.get(d);
      if (isComplete(h, l) || l?.isGraceDay || l?.isFreeze) {
        completed++;
        habitCompletions++;
      }
    }
    totalCompletions += habitCompletions;
    if (habitCompletions > topHabitCompletions) {
      topHabitCompletions = habitCompletions;
      topHabit = h;
    }

    bestStreak = Math.max(bestStreak, longestRunInRange(h, hLogs, monthStart, monthEnd));
  }

  const completionPct = scheduled === 0 ? 0 : Math.round((100 * completed) / scheduled);

  return {
    completionPct,
    bestStreak,
    topHabit: topHabit?.name ?? null,
    totalCompletions,
  };
}

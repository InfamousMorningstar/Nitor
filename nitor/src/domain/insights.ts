import type { Habit, Log, Insight } from "@/domain/types";
import { isComplete, computeStreak } from "@/domain/streaks";
import { today } from "@/domain/dates";

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

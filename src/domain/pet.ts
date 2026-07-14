import type { Habit, Log } from "@/domain/types";
import { isComplete, computeStreak } from "@/domain/streaks";
import { addDays, diffDays, today } from "@/domain/dates";
import { dailyCompletion } from "@/domain/stats";

const GLOW_WINDOW_DAYS = 7;

/**
 * Nix's glow = the 7-day completion rate (0..1): completed-scheduled over
 * scheduled, across active habits, for the trailing week ending `asOf`.
 * This is the ONLY thing that drives the creature's brightness. It never
 * drops to a "dead" or punitive state — dimming is the maximum consequence.
 */
export function glowRate(habits: Habit[], logs: Log[], asOf: string = today()): number {
  const from = addDays(asOf, -(GLOW_WINDOW_DAYS - 1));
  const daily = dailyCompletion(habits, logs, from, asOf);
  const totals = daily.reduce(
    (acc, d) => ({ done: acc.done + d.done, scheduled: acc.scheduled + d.scheduled }),
    { done: 0, scheduled: 0 }
  );
  return totals.scheduled === 0 ? 0 : totals.done / totals.scheduled;
}

export type PetMood = "radiant" | "glowing" | "idle" | "sleepy";

/** Maps a 0..1 glow rate onto a coarse mood used for copy + creature state. */
export function moodFromGlow(glow: number): PetMood {
  if (glow >= 0.85) return "radiant";
  if (glow >= 0.5) return "glowing";
  if (glow >= 0.2) return "idle";
  return "sleepy";
}

export interface EvolutionStageInfo {
  key: "egg" | "hatchling" | "juvenile" | "radiant";
  label: string;
  /** active days required to reach this stage */
  threshold: number;
}

export const EVOLUTION_STAGES: EvolutionStageInfo[] = [
  { key: "egg", label: "Egg", threshold: 0 },
  { key: "hatchling", label: "Hatchling", threshold: 7 },
  { key: "juvenile", label: "Juvenile", threshold: 30 },
  { key: "radiant", label: "Radiant", threshold: 100 },
];

/** Distinct calendar dates with at least one completed habit log. */
export function activeDayCount(habits: Habit[], logs: Log[]): number {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const dates = new Set<string>();
  for (const l of logs) {
    const h = byId.get(l.habitId);
    if (h && isComplete(h, l)) dates.add(l.date);
  }
  return dates.size;
}

/** Ascending list of distinct dates with at least one completed habit log. */
function activeDates(habits: Habit[], logs: Log[]): string[] {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const dates = new Set<string>();
  for (const l of logs) {
    const h = byId.get(l.habitId);
    if (h && isComplete(h, l)) dates.add(l.date);
  }
  return Array.from(dates).sort((a, b) => diffDays(a, b));
}

export interface EvolutionProgress {
  stage: EvolutionStageInfo;
  stageIndex: number;
  activeDays: number;
  next: EvolutionStageInfo | null;
  /** 0..1 progress toward `next` (1 when already at the final stage) */
  progress: number;
  /** active days still needed to reach `next` (0 when already at the final stage) */
  daysToNext: number;
}

export function evolutionProgress(activeDays: number): EvolutionProgress {
  let stageIndex = 0;
  for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
    if (activeDays >= EVOLUTION_STAGES[i].threshold) {
      stageIndex = i;
      break;
    }
  }
  const stage = EVOLUTION_STAGES[stageIndex];
  const next = EVOLUTION_STAGES[stageIndex + 1] ?? null;
  if (!next) {
    return { stage, stageIndex, activeDays, next: null, progress: 1, daysToNext: 0 };
  }
  const span = next.threshold - stage.threshold;
  const progress = span === 0 ? 1 : Math.min(1, (activeDays - stage.threshold) / span);
  return { stage, stageIndex, activeDays, next, progress, daysToNext: Math.max(0, next.threshold - activeDays) };
}

/** Longest streak ever reached by any non-archived habit — drives wardrobe unlocks. */
export function bestStreakDays(habits: Habit[], logs: Log[]): number {
  let best = 0;
  for (const h of habits.filter((x) => !x.archived)) {
    const habitLogs = logs.filter((l) => l.habitId === h.id);
    best = Math.max(best, computeStreak(h, habitLogs).longest);
  }
  return best;
}

export type WardrobeKind = "hat" | "trail" | "glow";

export interface WardrobeItem {
  id: string;
  label: string;
  /** best-streak days required to unlock */
  milestone: number;
  kind: WardrobeKind;
}

/**
 * Purely cosmetic unlocks at streak milestones. Nothing here is ever
 * purchasable — the only currency is consistency.
 */
export const WARDROBE_ITEMS: WardrobeItem[] = [
  { id: "none", label: "None", milestone: 0, kind: "hat" },
  { id: "halo", label: "Halo ring", milestone: 7, kind: "hat" },
  { id: "embers", label: "Ember trail", milestone: 21, kind: "trail" },
  { id: "aurora", label: "Aurora glow", milestone: 50, kind: "glow" },
  { id: "crown", label: "Radiant crown", milestone: 100, kind: "hat" },
];

export interface MemoryEntry {
  id: string;
  date: string;
  label: string;
}

/**
 * Derives a short chronological memory timeline. Hatch date and evolution
 * milestones come straight from the data (earliest completion date, and the
 * date the active-day count first crossed each stage threshold); the
 * best-streak line is milestone-based since streak history isn't tracked
 * day-by-day.
 */
export function buildMemoryLog(habits: Habit[], logs: Log[], petName: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const dates = activeDates(habits, logs);

  if (dates.length > 0) {
    entries.push({ id: "hatch", date: dates[0], label: `${petName} hatched` });
  }

  for (const stage of EVOLUTION_STAGES) {
    if (stage.threshold === 0) continue;
    if (dates.length >= stage.threshold) {
      entries.push({
        id: `stage-${stage.key}`,
        date: dates[stage.threshold - 1],
        label: `Reached ${stage.label}`,
      });
    }
  }

  const best = bestStreakDays(habits, logs);
  const milestones = WARDROBE_ITEMS.map((w) => w.milestone).filter((m) => m > 0 && best >= m);
  if (milestones.length > 0) {
    entries.push({ id: "best-streak", date: today(), label: `Best streak so far: ${best} days` });
  }

  return entries.sort((a, b) => diffDays(a.date, b.date));
}

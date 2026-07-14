import type { Habit, Log } from "@/domain/types";
import { addDays, diffDays } from "@/domain/dates";
import { isScheduledOn, isComplete, computeStreak } from "@/domain/streaks";

export const EARN_EVERY = 7;
export const BANK_CAP = 2;
export const MIN_STREAK_TO_PROMPT = 3;

function byDate(logs: Log[]): Map<string, Log> {
  const m = new Map<string, Log>();
  for (const l of logs) m.set(l.date, l);
  return m;
}

/** Current freeze bank (0..BANK_CAP) via a chronological earn/spend simulation. */
export function freezeBank(habit: Habit, logs: Log[], asOf: string): number {
  const map = byDate(logs);
  let bank = 0;
  let counter = 0;
  for (let d = habit.createdAt; diffDays(asOf, d) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    const l = map.get(d);
    if (l?.isFreeze) {
      bank = Math.max(0, bank - 1); // spend
      counter++; // protected day counts toward the next earn
    } else if (isComplete(habit, l) || l?.isGraceDay) {
      counter++;
    } else {
      counter = 0; // unprotected miss breaks the earn run
      continue;
    }
    if (counter >= EARN_EVERY) {
      counter = 0;
      if (bank < BANK_CAP) bank++;
    }
  }
  return bank;
}

/** The single date a freeze could rescue right now, or null. */
export function rescuableMiss(habit: Habit, logs: Log[], asOf: string): string | null {
  const map = byDate(logs);
  // most recent scheduled day strictly before asOf
  let d1: string | null = null;
  for (let d = addDays(asOf, -1); diffDays(d, habit.createdAt) >= 0; d = addDays(d, -1)) {
    if (isScheduledOn(habit, d)) { d1 = d; break; }
  }
  if (!d1) return null;
  const l1 = map.get(d1);
  const missed = !(isComplete(habit, l1) || l1?.isGraceDay || l1?.isFreeze);
  if (!missed) return null;
  // previous scheduled day must be completed (isolated miss) and streak ≥ threshold
  let d0: string | null = null;
  for (let d = addDays(d1, -1); diffDays(d, habit.createdAt) >= 0; d = addDays(d, -1)) {
    if (isScheduledOn(habit, d)) { d0 = d; break; }
  }
  if (!d0) return null;
  const l0 = map.get(d0);
  if (!(isComplete(habit, l0) || l0?.isGraceDay || l0?.isFreeze)) return null;
  if (computeStreak(habit, logs, d0).current < MIN_STREAK_TO_PROMPT) return null;
  return d1;
}

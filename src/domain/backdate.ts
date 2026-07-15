import type { Habit } from "@/domain/types";
import { addDays } from "@/domain/dates";
import { isScheduledOn } from "@/domain/streaks";

export const BACKDATE_DAYS = 7;

export function editableDays(habit: Habit, asOf: string): { date: string; scheduled: boolean }[] {
  const out: { date: string; scheduled: boolean }[] = [];
  for (let i = 0; i < BACKDATE_DAYS; i++) {
    const date = addDays(asOf, -i);
    out.push({ date, scheduled: isScheduledOn(habit, date) });
  }
  return out;
}

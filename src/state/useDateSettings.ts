"use client";
import { useMemo } from "react";
import { useSettingsStore } from "@/state/settingsStore";
import { today } from "@/domain/dates";
import type { StreakOptions } from "@/domain/streaks";

/**
 * The current logical date, honouring the user's day-rollover hour.
 *
 * Client components should prefer this over calling `today()` directly, or the
 * setting silently does nothing for them — which is exactly the state these
 * preferences were in: persisted, presented, and consumed by nobody.
 */
export function useToday(): string {
  const rolloverHour = useSettingsStore((s) => s.dayRolloverHour);
  return today(rolloverHour);
}

/**
 * Streak options derived from user settings. Pass to computeStreak so vacation
 * mode actually pauses streaks rather than merely claiming to.
 */
export function useStreakOptions(): StreakOptions {
  const vacationSince = useSettingsStore((s) => s.vacationSince);
  // Memoised on the primitive, not rebuilt per render: callers pass this into
  // useMemo dependency arrays, and a fresh object every render would silently
  // invalidate every streak computation on the page.
  return useMemo(() => ({ vacationSince }), [vacationSince]);
}

/**
 * The weekday indices in the user's preferred display order, starting from
 * Sunday (0) or Monday (1). 0=Sun..6=Sat throughout the app.
 */
export function useWeekOrder(): number[] {
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  return useMemo(() => weekOrderFrom(weekStartsOn), [weekStartsOn]);
}

/** Pure helper, so the ordering is testable without a React tree. */
export function weekOrderFrom(weekStartsOn: 0 | 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
}

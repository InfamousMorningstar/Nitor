function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * The current logical date.
 *
 * `rolloverHour` is the hour at which a new day begins for this user. At the
 * default of 0 this is the plain calendar date. Set to 3, someone logging a
 * habit at 1am is still finishing yesterday — which is the point: a day that
 * ends at midnight punishes anyone whose day does not, and they lose a streak
 * they actually kept.
 *
 * Implemented by shifting the clock backward before reading the calendar date,
 * so the whole app keeps dealing in plain YYYY-MM-DD strings and no other date
 * function needs to know this setting exists.
 */
export function today(rolloverHour = 0): string {
  const override = (globalThis as Record<string, unknown>).__NITOR_NOW__;
  if (typeof override === "string") return override;
  const n = new Date(Date.now() - rolloverHour * MS_PER_HOUR);
  return fmt(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
}

export function addDays(date: string, n: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

export function diffDays(a: string, b: string): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / MS);
}

export function weekdayOf(date: string): number {
  return toUTC(date).getUTCDay();
}

export function eachDayOfMonth(year: number, monthIndex0: number): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  while (d.getUTCMonth() === monthIndex0) {
    days.push(fmt(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

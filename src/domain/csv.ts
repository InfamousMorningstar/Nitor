import type { Habit, Log } from "./types";

/** Escapes a single CSV field per RFC 4180: quoted if it contains a comma, quote, or newline. */
export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serializes logs (with habit names resolved) into a CSV string: habitId,habitName,date,value,isGraceDay,isFreeze */
export function logsToCsv(habits: Habit[], logs: Log[]): string {
  const nameById = new Map(habits.map((h) => [h.id, h.name]));
  const header = "habitId,habitName,date,value,isGraceDay,isFreeze";
  const rows = logs.map((l) =>
    [l.habitId, nameById.get(l.habitId) ?? "", l.date, String(l.value), String(l.isGraceDay), String(Boolean(l.isFreeze))]
      .map(csvEscape)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

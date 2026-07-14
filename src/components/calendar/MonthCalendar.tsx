import type { CSSProperties } from "react";
import type { Habit, Log } from "@/domain/types";
import { eachDayOfMonth, weekdayOf } from "@/domain/dates";
import { isScheduledOn, isComplete } from "@/domain/streaks";

const mono =
  "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Anti-punitive month calendar (Nitor Design Direction).
 *
 * Day coloring deliberately overrides the plan's red "missed" treatment:
 * - complete:      filled with the habit's own color.
 * - grace day:     amber "protected" glow — forgiven, not failed.
 * - missed:        a quiet hollow (hairline outline, muted text). No red.
 * - not scheduled: barely-there, low-opacity muted text, no fill.
 */
export function MonthCalendar({
  habit,
  logs,
  year,
  monthIndex0,
}: {
  habit: Habit;
  logs: Log[];
  year: number;
  monthIndex0: number;
}) {
  const days = eachDayOfMonth(year, monthIndex0);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const pad = weekdayOf(days[0]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={i}
            className={`${mono} text-center text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: pad }).map((_, i) => (
          <div key={`pad${i}`} />
        ))}
        {days.map((date) => {
          const scheduled = isScheduledOn(habit, date);
          const log = byDate.get(date);
          const complete = isComplete(habit, log);
          const grace = Boolean(log?.isGraceDay);
          const dayNum = Number(date.slice(-2));

          let className = "grid aspect-square place-items-center rounded-xl border ";
          let style: CSSProperties = { borderColor: "transparent" };

          if (!scheduled) {
            // Not scheduled: barely-there, no fill.
            className += "[color:rgb(var(--muted)/0.35)]";
          } else if (complete) {
            // Complete: filled with the habit's own color.
            className += "border-transparent";
            style = { background: habit.color, color: "white" };
          } else if (grace) {
            // Grace day: amber "protected" treatment — forgiven, not failed.
            className +=
              "[color:rgb(var(--text))] [background:rgb(var(--nitor)/0.16)] [border-color:rgb(var(--nitor)/0.5)]";
          } else {
            // Missed: quiet hollow — faint hairline outline, muted text, no red.
            className += "[color:rgb(var(--muted))] [border-color:rgb(var(--hairline)/0.25)]";
          }

          return (
            <div key={date} className={`${className} ${mono} text-xs`} style={style}>
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

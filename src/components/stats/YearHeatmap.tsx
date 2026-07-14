"use client";
import { useId, useMemo, useState } from "react";
import type { DailyCompletion } from "@/domain/stats";
import { addDays, diffDays, weekdayOf } from "@/domain/dates";

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT_LABEL_W = 24;
const TOP_LABEL_H = 16;

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 5-step sequential single-hue ramp (magnitude), matte + hairline. */
const RAMP = [
  "rgb(var(--hairline) / 0.06)",
  "rgb(var(--accent) / 0.28)",
  "rgb(var(--accent) / 0.48)",
  "rgb(var(--accent) / 0.70)",
  "rgb(var(--accent) / 1.0)",
];

function rampIndex(done: number, maxDone: number): number {
  if (done <= 0 || maxDone <= 0) return 0;
  const ratio = done / maxDone;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

interface Cell {
  date: string | null;
  done: number;
  scheduled: number;
  col: number;
  row: number;
}

interface YearHeatmapProps {
  /** Contiguous, ascending daily completion counts for the selected range. */
  data: DailyCompletion[];
}

/**
 * GitHub-style completion heatmap: columns = weeks, rows = Sun..Sat. Matte
 * single-hue sequential ramp by raw completion count (magnitude). Centerpiece
 * chart of the Stats page.
 */
export function YearHeatmap({ data }: YearHeatmapProps) {
  const titleId = useId();
  const [active, setActive] = useState<Cell | null>(null);

  const { cols, months, maxDone } = useMemo(() => {
    if (data.length === 0) return { cols: [] as Cell[][], months: [] as { label: string; col: number }[], maxDone: 0 };

    const first = data[0].date;
    const last = data[data.length - 1].date;
    const paddedStart = addDays(first, -weekdayOf(first));
    const byDate = new Map(data.map((d) => [d.date, d]));

    const dates: (string | null)[] = [];
    for (let d = paddedStart; diffDays(d, last) <= 0; d = addDays(d, 1)) dates.push(d);
    while (dates.length % 7 !== 0) dates.push(null);

    const numWeeks = dates.length / 7;
    const cols: Cell[][] = Array.from({ length: numWeeks }, () => []);
    let maxDone = 0;
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const col = Math.floor(i / 7);
      const row = i % 7;
      const entry = date ? byDate.get(date) : undefined;
      const done = entry?.done ?? 0;
      const scheduled = entry?.scheduled ?? 0;
      if (date && done > maxDone) maxDone = done;
      cols[col].push({ date: date ?? null, done, scheduled, col, row });
    }

    const months: { label: string; col: number }[] = [];
    let prevMonth = -1;
    for (let col = 0; col < numWeeks; col++) {
      const firstDated = cols[col].find((c) => c.date);
      if (!firstDated?.date) continue;
      const m = Number(firstDated.date.split("-")[1]) - 1;
      if (m !== prevMonth) {
        months.push({ label: MONTH_LABELS[m], col });
        prevMonth = m;
      }
    }

    return { cols, months, maxDone };
  }, [data]);

  const numWeeks = cols.length;
  const width = LEFT_LABEL_W + numWeeks * STEP;
  const height = TOP_LABEL_H + 7 * STEP;

  const tooltipText = (c: Cell) => {
    if (!c.date) return "";
    if (c.scheduled === 0) return `${formatDateLabel(c.date)} — no habits scheduled`;
    return `${formatDateLabel(c.date)} — ${c.done} of ${c.scheduled} habit${c.scheduled === 1 ? "" : "s"} completed`;
  };

  return (
    <div>
      <h3 id={titleId} className="sr-only">
        Daily habit completion heatmap
      </h3>

      {/* Screen-reader data fallback */}
      <table className="sr-only">
        <caption>Daily habit completions by date</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Habits completed</th>
            <th scope="col">Habits scheduled</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.done}</td>
              <td>{d.scheduled}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative overflow-x-auto">
        <svg
          role="group"
          aria-labelledby={titleId}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
        >
          {months.map((m) => (
            <text
              key={`${m.label}-${m.col}`}
              x={LEFT_LABEL_W + m.col * STEP}
              y={TOP_LABEL_H - 5}
              className="font-[family-name:var(--font-mono)]"
              fontSize={9}
              fill="rgb(var(--text-mute))"
            >
              {m.label}
            </text>
          ))}

          {WEEKDAY_LABELS.map((label, row) =>
            label ? (
              <text
                key={row}
                x={0}
                y={TOP_LABEL_H + row * STEP + CELL - 2}
                className="font-[family-name:var(--font-mono)]"
                fontSize={9}
                fill="rgb(var(--text-mute))"
              >
                {label}
              </text>
            ) : null
          )}

          {cols.map((week) =>
            week.map((c) => {
              if (!c.date) return null;
              const fill = RAMP[rampIndex(c.done, maxDone)];
              const x = LEFT_LABEL_W + c.col * STEP;
              const y = TOP_LABEL_H + c.row * STEP;
              return (
                <rect
                  key={c.date}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  ry={2}
                  fill={fill}
                  tabIndex={0}
                  role="img"
                  aria-label={tooltipText(c)}
                  className="outline-none focus-visible:[stroke:rgb(var(--accent))] focus-visible:[stroke-width:1.5px] cursor-default"
                  onMouseEnter={() => setActive(c)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c)}
                  onBlur={() => setActive(null)}
                />
              );
            })
          )}
        </svg>

        {active?.date && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))]"
            style={{
              left: LEFT_LABEL_W + active.col * STEP + CELL / 2,
              top: TOP_LABEL_H + active.row * STEP - 6,
            }}
          >
            {tooltipText(active)}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2" aria-hidden="true">
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
          Less
        </span>
        {RAMP.map((color, i) => (
          <span
            key={i}
            className="h-[9px] w-[9px] rounded-[2px]"
            style={{ background: color }}
          />
        ))}
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
          More
        </span>
      </div>
    </div>
  );
}

import type { Habit, Log } from "@/domain/types";
import { addDays, diffDays } from "@/domain/dates";
import { useToday } from "@/state/useDateSettings";
import { isComplete, isScheduledOn } from "@/domain/streaks";

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;

type CellStatus = "complete" | "protected" | "missed" | "none";

interface Cell {
  date: string;
  status: CellStatus;
  col: number;
  row: number;
}

/** Matte single-hue amber treatment, binary per day (one habit, not a magnitude ramp). */
const FILL: Record<CellStatus, string> = {
  complete: "rgb(var(--accent) / 1.0)",
  protected: "rgb(var(--accent) / 0.18)",
  missed: "rgb(var(--hairline) / 0.12)",
  none: "rgb(var(--hairline) / 0.03)",
};

/** Only the "protected" (grace day / streak-freeze) cells get a ring, to read as distinct from a plain completion. */
const STROKE: Partial<Record<CellStatus, string>> = {
  protected: "rgb(var(--accent) / 0.55)",
};

function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function statusLabel(status: CellStatus): string {
  if (status === "complete") return "completed";
  if (status === "protected") return "protected (grace day / freeze)";
  if (status === "missed") return "missed";
  return "not scheduled";
}

interface MiniHeatmapProps {
  habit: Habit;
  logs: Log[];
  /** Number of trailing weeks (columns) to render, ending today. */
  weeks?: number;
}

/**
 * Compact completion grid for a single habit — a smaller sibling of
 * YearHeatmap sized to live inside the 420px habit drawer (default 13 weeks
 * / 91 days, ending today). Unlike YearHeatmap's aggregate magnitude ramp,
 * this tracks one habit so each day is a binary status: filled amber when
 * complete; a subtler amber ring/tint when the day was protected by a grace
 * day or streak-freeze (not a normal completion); faint when scheduled but
 * missed (no red — anti-punitive, matching MonthCalendar's convention); and
 * near-transparent when the day wasn't scheduled at all.
 */
export function MiniHeatmap({ habit, logs, weeks = 13 }: MiniHeatmapProps) {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const end = useToday();
  const totalDays = weeks * 7;

  const cells: Cell[] = [];
  let completeCount = 0;
  let scheduledCount = 0;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(end, -(totalDays - 1 - i));
    const col = Math.floor(i / 7);
    const row = i % 7;
    const log = byDate.get(date);
    const existedYet = diffDays(date, habit.createdAt) >= 0;
    const scheduled = existedYet && isScheduledOn(habit, date);
    const complete = isComplete(habit, log);
    const protectedDay = Boolean(log?.isGraceDay || log?.isFreeze);

    let status: CellStatus;
    if (complete) status = "complete";
    else if (scheduled && protectedDay) status = "protected";
    else if (scheduled) status = "missed";
    else status = "none";

    if (scheduled) scheduledCount++;
    if (status === "complete") completeCount++;

    cells.push({ date, status, col, row });
  }

  const width = weeks * STEP - GAP;
  const height = 7 * STEP - GAP;
  const summary = `${weeks}-week completion history for ${habit.name}: ${completeCount} of ${scheduledCount} scheduled day${
    scheduledCount === 1 ? "" : "s"
  } completed`;

  return (
    <svg
      role="img"
      aria-label={summary}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {cells.map((c) => (
        <rect
          key={c.date}
          x={c.col * STEP}
          y={c.row * STEP}
          width={CELL}
          height={CELL}
          rx={2}
          ry={2}
          fill={FILL[c.status]}
          stroke={STROKE[c.status] ?? "none"}
          strokeWidth={STROKE[c.status] ? 1 : 0}
        >
          <title>{`${formatDateLabel(c.date)} — ${statusLabel(c.status)}`}</title>
        </rect>
      ))}
    </svg>
  );
}

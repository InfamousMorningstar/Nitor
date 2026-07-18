"use client";
import { useId, useState } from "react";
import type { WeekdayPoint } from "@/domain/stats";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun display order
const LABELS: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

const WIDTH = 320;
const HEIGHT = 180;
const PAD_T = 10;
const PAD_B = 26;
const BAR_GAP = 8;
const RADIUS = 4;

function roundedTopPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return "";
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

interface WeekdayBarsProps {
  data: WeekdayPoint[];
}

/** 7 vertical bars (Mon-Sun) showing per-weekday completion rate. Matte accent fills. */
export function WeekdayBars({ data }: WeekdayBarsProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const byWeekday = new Map(data.map((d) => [d.weekday, d.pct]));
  const ordered = ORDER.map((weekday) => ({ weekday, pct: byWeekday.get(weekday) ?? 0 }));

  const plotH = HEIGHT - PAD_T - PAD_B;
  const barW = (WIDTH - BAR_GAP * (ordered.length - 1)) / ordered.length;
  const baseline = PAD_T + plotH;

  return (
    <div>
      <h3 id={titleId} className="sr-only">
        Completion rate by weekday
      </h3>
      <table className="sr-only">
        <caption>Completion rate by weekday</caption>
        <thead>
          <tr>
            <th scope="col">Weekday</th>
            <th scope="col">Completion %</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((d) => (
            <tr key={d.weekday}>
              <td>{LABELS[d.weekday]}</td>
              <td>{d.pct}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative">
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          className="block"
        >
          <line
            x1={0}
            x2={WIDTH}
            y1={baseline}
            y2={baseline}
            stroke="rgb(var(--text-mute) / 0.3)"
            strokeWidth={1}
          />
          {ordered.map((d, i) => {
            const x = i * (barW + BAR_GAP);
            const h = Math.max(1, (d.pct / 100) * plotH);
            const y = baseline - h;
            const isHover = hover === i;
            return (
              <g key={d.weekday}>
                <path
                  d={roundedTopPath(x, y, barW, h, RADIUS)}
                  fill={isHover ? "rgb(var(--accent-glow))" : "rgb(var(--accent))"}
                  tabIndex={0}
                  role="img"
                  aria-label={`${LABELS[d.weekday]}: ${d.pct}% completion`}
                  className="outline-none cursor-default focus-visible:[stroke:rgb(var(--text))] focus-visible:[stroke-width:2px]"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
                <text
                  x={x + barW / 2}
                  y={baseline + 14}
                  textAnchor="middle"
                  fontSize={9}
                  className="font-[family-name:var(--font-mono)]"
                  fill="rgb(var(--text-mute))"
                >
                  {LABELS[d.weekday]}
                </text>
              </g>
            );
          })}
        </svg>

        {hover !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))]"
            style={{
              left: `${((hover * (barW + BAR_GAP) + barW / 2) / WIDTH) * 100}%`,
              top: baseline - Math.max(1, (ordered[hover].pct / 100) * plotH) - 6,
            }}
          >
            {LABELS[ordered[hover].weekday]} — {ordered[hover].pct}%
          </div>
        )}
      </div>
    </div>
  );
}

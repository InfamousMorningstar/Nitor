"use client";
import { useId, useMemo, useRef, useState } from "react";
import type { MomentumPoint } from "@/domain/stats";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_L = 30;
const PAD_R = 8;
const PAD_T = 10;
const PAD_B = 22;

interface MomentumLineProps {
  data: MomentumPoint[];
  /** Dotted goal line target, 0-100. */
  goal?: number;
}

/**
 * Thin single-series line: rolling 30-day completion momentum over time.
 * Matte accent line, recessive gridlines, dotted goal line, crosshair +
 * tooltip on hover/focus. No area fill.
 */
export function MomentumLine({ data, goal = 80 }: MomentumLineProps) {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;

  const points = useMemo(() => {
    const n = data.length;
    return data.map((d, i) => ({
      ...d,
      x: PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW),
      y: PAD_T + plotH - (d.pct / 100) * plotH,
    }));
  }, [data, plotW, plotH]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const goalY = PAD_T + plotH - (goal / 100) * plotH;
  const active = activeIdx !== null ? points[activeIdx] : null;

  const handlePointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActiveIdx(nearest);
  };

  return (
    <div>
      <h3 id={titleId} className="sr-only">
        Momentum: rolling 30-day completion rate over time
      </h3>
      <table className="sr-only">
        <caption>Momentum by date</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Completion %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.pct}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative">
        <svg
          ref={svgRef}
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          className="block touch-none rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          tabIndex={0}
          onMouseMove={(e) => handlePointer(e.clientX)}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchStart={(e) => handlePointer(e.touches[0].clientX)}
          onTouchMove={(e) => handlePointer(e.touches[0].clientX)}
          onTouchEnd={() => setActiveIdx(null)}
          onFocus={() => setActiveIdx((i) => i ?? points.length - 1)}
          onBlur={() => setActiveIdx(null)}
          onKeyDown={(e) => {
            if (activeIdx === null) return;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setActiveIdx(Math.max(0, activeIdx - 1));
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setActiveIdx(Math.min(points.length - 1, activeIdx + 1));
            }
          }}
        >
          {[0, 50, 100].map((v) => {
            const y = PAD_T + plotH - (v / 100) * plotH;
            return (
              <g key={v}>
                <line
                  x1={PAD_L}
                  x2={WIDTH - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="rgb(var(--text-mute) / 0.3)"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  className="font-[family-name:var(--font-mono)]"
                  fill="rgb(var(--text-mute))"
                >
                  {v}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD_L}
            x2={WIDTH - PAD_R}
            y1={goalY}
            y2={goalY}
            stroke="rgb(var(--text-mute))"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={WIDTH - PAD_R}
            y={goalY - 4}
            textAnchor="end"
            fontSize={9}
            className="font-[family-name:var(--font-mono)]"
            fill="rgb(var(--text-mute))"
          >
            Goal {goal}%
          </text>

          {points.length > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {active && (
            <g aria-hidden="true">
              <line
                x1={active.x}
                x2={active.x}
                y1={PAD_T}
                y2={PAD_T + plotH}
                stroke="rgb(var(--text-mute) / 0.4)"
                strokeWidth={1}
              />
              <circle cx={active.x} cy={active.y} r={3} fill="rgb(var(--accent))" />
            </g>
          )}
        </svg>

        {active && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))]"
            style={{ left: `${(active.x / WIDTH) * 100}%`, top: active.y - 8 }}
          >
            {active.date} — {active.pct}%
          </div>
        )}
      </div>
    </div>
  );
}

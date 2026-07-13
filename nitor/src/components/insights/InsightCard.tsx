import type { Insight, InsightKind } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]";
const mono = "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";

const kindLabel: Record<InsightKind, string> = {
  correlation: "Correlation",
  best_time: "Best time",
  trend: "Trend",
  story: "Story",
};

/** Render the insight's stat as an instrument reading, per kind. */
function statReading(insight: Insight): string {
  switch (insight.kind) {
    case "correlation":
      return `r=${insight.stat}`;
    case "best_time":
      return `${insight.stat}:00`;
    case "trend":
      return `${insight.stat > 0 ? "+" : ""}${insight.stat}%`;
    default:
      return `${insight.stat}`;
  }
}

/**
 * A correlation / best-time card: label, the stat rendered as a mono
 * tabular "instrument reading", and the narrative in muted text. Elevated,
 * hairline-bordered surface (not glass — glass is reserved for the hero).
 */
export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-[28px] border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-5">
      <p className={eyebrow}>{kindLabel[insight.kind]}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <span className="text-sm font-medium leading-snug">{insight.label}</span>
        <span className={`${mono} shrink-0 text-base [color:rgb(var(--nitor))]`}>
          {statReading(insight)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed [color:rgb(var(--muted))]">{insight.narrative}</p>
    </div>
  );
}

import type { Insight } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";

/**
 * A flat hairline card for the "best completion window" insight — label,
 * the hour rendered as a mono instrument reading, and the worded narrative.
 * Matte only, no glass. (Correlation is handled by its own card — see
 * CorrelationCard — so it never reaches this component and never risks
 * surfacing a raw coefficient.)
 */
export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-2xl border p-5 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
      <p className={eyebrow}>Best completion window</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <span className="text-sm font-medium leading-snug [color:rgb(var(--text))]">{insight.label}</span>
        <span className={`${mono} shrink-0 text-base [color:rgb(var(--accent))]`}>
          {insight.stat}:00
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed [color:rgb(var(--text-dim))]">{insight.narrative}</p>
    </div>
  );
}

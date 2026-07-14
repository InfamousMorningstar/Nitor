import type { CorrelationInsight } from "@/domain/insights";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";

/**
 * Worded correlation between your two most-logged habits. Never renders a
 * raw coefficient — `correlationInsight` already gates and translates it
 * into a sentence, or a gentle "not enough data" note.
 */
export function CorrelationCard({ correlation }: { correlation: CorrelationInsight }) {
  return (
    <div className="rounded-2xl border p-5 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
      <p className={eyebrow}>Correlation</p>
      <p
        className={`mt-3 text-sm leading-relaxed ${
          correlation.meaningful ? "[color:rgb(var(--text-dim))]" : "[color:rgb(var(--text-mute))]"
        }`}
      >
        {correlation.narrative}
      </p>
    </div>
  );
}

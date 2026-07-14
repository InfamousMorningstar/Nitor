import type { StackingSuggestion } from "@/domain/insights";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";

/**
 * Suggests stacking one habit right after another, backed by the observed
 * follow-through rate. Omitted from the page entirely when no pair
 * qualifies.
 */
export function StackingCard({ stacking }: { stacking: StackingSuggestion }) {
  return (
    <div className="rounded-2xl border p-5 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
      <p className={eyebrow}>Habit stacking</p>
      <p className="mt-3 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
        You finish <span className="[color:rgb(var(--text))]">{stacking.then}</span>{" "}
        <span className={`${mono} [color:rgb(var(--accent))]`}>{stacking.rate}%</span> of the time right after{" "}
        <span className="[color:rgb(var(--text))]">{stacking.after}</span> — stack them?
      </p>
    </div>
  );
}

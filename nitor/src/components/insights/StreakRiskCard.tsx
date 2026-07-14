import type { StreakRiskResult } from "@/domain/insights";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--accent))]";

/**
 * Flags the habit most at risk of slipping. Amber is used sparingly here —
 * a small dot and the eyebrow label — to signal attention without reading
 * as an alarm. Omitted from the page entirely when nothing is at risk.
 */
export function StreakRiskCard({ risk }: { risk: StreakRiskResult }) {
  return (
    <div className="rounded-2xl border p-5 [border-color:rgb(var(--accent)/0.25)] [background:rgb(var(--surface))]">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full [background:rgb(var(--accent))]" aria-hidden="true" />
        <p className={eyebrow}>Streak risk</p>
      </div>
      <p className="mt-3 text-sm font-medium leading-snug [color:rgb(var(--text))]">
        {risk.habit.emoji} {risk.habit.name}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
        {risk.reason.charAt(0).toUpperCase() + risk.reason.slice(1)}.
      </p>
    </div>
  );
}

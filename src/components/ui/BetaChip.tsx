import { BETA_CHIP_TOOLTIP, FEEDBACK_MAILTO } from "@/content/beta";

/**
 * Persistent in-app beta tag. The whole chip is the feedback mailto, so the
 * tooltip never has to be hovered into (it stays pointer-events-none) and the
 * action is reachable by keyboard via the chip itself. Matches the top-bar pet
 * chip: hairline pill, amber dot, mono micro-caps.
 */
export function BetaChip() {
  return (
    <a
      href={FEEDBACK_MAILTO}
      className="group relative inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] [border-color:rgb(var(--hairline)/0.08)] hover:[border-color:rgb(var(--accent)/0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
    >
      <span
        className="h-1 w-1 rounded-full [background:rgb(var(--accent))]"
        aria-hidden="true"
      />
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.06em] [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] group-hover:[color:rgb(var(--text))]">
        Beta
      </span>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-lg border p-2.5 text-[11px] leading-relaxed opacity-0 transition-opacity duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] [background:rgb(var(--surface-2))] [border-color:rgb(var(--hairline)/0.08)] [color:rgb(var(--text-dim))] group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {BETA_CHIP_TOOLTIP}
      </span>
    </a>
  );
}

import type { Insight } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";

/**
 * The weekly story — the page's lede. A large flat hairline card, narrative
 * set big in the display face so it reads first, like a newspaper headline.
 * Matte only: 1px hairline border + a single surface step, no glass.
 */
export function StoryCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-2xl border p-7 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] md:p-10">
      <p className={eyebrow}>This week</p>
      <p className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-2xl font-medium leading-snug tracking-tight [color:rgb(var(--text))] md:text-[32px] md:leading-[1.2]">
        {insight.narrative}
      </p>
    </div>
  );
}

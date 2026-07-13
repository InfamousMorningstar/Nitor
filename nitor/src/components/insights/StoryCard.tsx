import type { Insight } from "@/domain/types";
import { Glass } from "@/components/glass/Glass";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--nitor))]";

/**
 * The weekly AI-written "story" — the product's HERO moment. A prominent
 * glass card spanning the full width of the Insights dashboard, meant to
 * read as the centerpiece: a small mono eyebrow, then the narrative set
 * large in the display face.
 */
export function StoryCard({ insight }: { insight: Insight }) {
  return (
    <Glass className="p-7 md:p-10">
      <p className={eyebrow}>This week</p>
      <p className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-2xl font-medium leading-snug tracking-tight md:text-[32px] md:leading-[1.2]">
        {insight.narrative}
      </p>
    </Glass>
  );
}

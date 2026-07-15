const CARDS = [
  {
    n: "01",
    title: "Forgiving streaks",
    blurb:
      "Grace days you set yourself, plus freezes you earn every 7 days — Nitor asks before it spends one.",
  },
  {
    n: "02",
    title: "Fix any day",
    blurb:
      "A heatmap of your recent history at a glance, and a 7-day window to correct an honest mistake.",
  },
  {
    n: "03",
    title: "Quotes that stay fresh",
    blurb:
      "One verifiable quote a day, rotating by date, from a collection that keeps growing.",
  },
] as const;

/**
 * Compact 3-card teaser directly under the hero. Mirrors WhyNitor's section
 * rhythm (hairline border-top, max-w-[1200px] container, mono numbered
 * labels) but wraps each item in a bordered matte card — same card
 * language as the Hero slab / ScrollStory's habit card — since these three
 * are discrete, parallel features rather than a flat positioning grid.
 * No animation: this sits right after the Hero's own parallax, so a static
 * strip keeps the page from feeling busy (also makes reduced-motion moot).
 */
export function HowItWorks() {
  return (
    <section className="border-t [border-color:rgb(var(--hairline)/0.08)] py-20 md:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10">
        <a
          href="https://github.com/InfamousMorningstar/Nitor/blob/main/docs/features/how-it-works.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          How it works &rarr;
        </a>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <div
              key={c.n}
              className="rounded-2xl border p-6 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
            >
              <span className="font-[family-name:var(--font-mono)] text-xs [color:rgb(var(--text-mute))]">
                {c.n}
              </span>
              <p className="mt-3 text-[15px] font-medium leading-snug [color:rgb(var(--text))]">
                {c.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
                {c.blurb}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COLUMNS = [
  {
    n: "01",
    title: "No ads, ever",
  },
  {
    n: "02",
    title: "Your data exports in one click (JSON + CSV)",
  },
  {
    n: "03",
    title: "Gamified, never manipulative",
    detail:
      "Momentum, grace days, and earned freezes reward consistency without turning one miss into a threat.",
  },
  {
    n: "04",
    title: "Insights that explain why you succeed, not just whether.",
  },
];

/**
 * Quiet 4-column positioning strip. No competitor logos, no bravado — just
 * a flat grid of hairline-divided columns on the plain background.
 */
export function WhyNitor() {
  return (
    <section className="border-t [border-color:rgb(var(--hairline)/0.08)] py-24 md:py-32">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10">
        <p className="max-w-[680px] font-[family-name:var(--font-display)] text-2xl font-medium leading-snug tracking-tight [color:rgb(var(--text))] md:text-3xl">
          Trackers are either spreadsheets with streaks or games with
          chores. Nitor is neither.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 md:mt-16 md:grid-cols-4">
          {COLUMNS.map((c) => (
            <div
              key={c.n}
              className="border-t pt-5 [border-color:rgb(var(--hairline)/0.08)]"
            >
              <span className="font-[family-name:var(--font-mono)] text-xs [color:rgb(var(--text-mute))]">
                {c.n}
              </span>
              <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text))]">
                {c.title}
              </p>
              {c.detail && (
                <p className="mt-2 text-sm leading-relaxed [color:rgb(var(--text-mute))]">
                  {c.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

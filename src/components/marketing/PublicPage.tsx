import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { KineticFooter } from "@/components/marketing/KineticFooter";

/**
 * Shared frame for the public (signed-out) content pages: /features, /pricing,
 * /changelog, /roadmap, /privacy, /terms. Deliberately not a redesign — it is
 * the exact frame /security already uses (MarketingNav → matte editorial
 * column → KineticFooter), extracted so the six pages cannot drift apart.
 *
 * Every route rendered through here must also be listed in PUBLIC_PATHS in
 * src/proxy.ts, or the guard bounces signed-out readers to /login.
 */

/** Small-caps mono label used above every section. Matches /security. */
export const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.14em] [color:rgb(var(--text-mute))]";

export function PublicPage({
  eyebrow: eyebrowText,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col [background:rgb(var(--bg))]">
      <MarketingNav />

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 pb-24 pt-32 md:px-10 md:pt-40">
        <section>
          <p className={eyebrow}>{eyebrowText}</p>
          <h1 className="mt-4 max-w-[18ch] font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-tight [color:rgb(var(--text))] sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed [color:rgb(var(--text-dim))]">
            {lede}
          </p>
        </section>

        {children}
      </main>

      <KineticFooter />
    </div>
  );
}

/**
 * A titled block. The label is the section's real heading, so it renders as an
 * h2 styled as the eyebrow — not as a <p>. Without this the page jumps h1 → h3
 * at the first Row and screen-reader users lose the outline.
 */
export function Section({
  label,
  intro,
  children,
}: {
  label: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-20">
      <h2 className={eyebrow}>{label}</h2>
      {intro ? (
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          {intro}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** The bordered note used for beta caveats. Same treatment as /security. */
export function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-14 rounded-xl border p-6 [background:rgb(var(--surface))] [border-color:rgb(var(--hairline)/0.1)]">
      <p className={eyebrow}>{label}</p>
      <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
        {children}
      </p>
    </section>
  );
}

/**
 * One hairline-separated row: a mono marker in the left gutter, then a title
 * and body. The marker carries real information (a status word, a date, a
 * phase) — never decoration.
 */
export function Row({
  marker,
  title,
  children,
}: {
  marker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 border-t py-6 [border-color:rgb(var(--hairline)/0.08)] sm:grid-cols-[7rem_1fr] sm:gap-x-8">
      <div
        aria-hidden="true"
        className="pt-0.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--accent))]"
      >
        {marker}
      </div>
      <div>
        <h3 className="text-[17px] font-medium [color:rgb(var(--text))]">
          <span className="sr-only">{marker} — </span>
          {title}
        </h3>
        <div className="mt-2 max-w-[62ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Plain prose block for the legal pages. Nests under its Section's h2. */
export function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t py-7 [border-color:rgb(var(--hairline)/0.08)]">
      <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight [color:rgb(var(--text))]">
        {title}
      </h3>
      <div className="mt-3 flex max-w-[68ch] flex-col gap-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
        {children}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { NixCreature } from "@/components/pet/NixCreature";
import { quoteOfDay } from "@/domain/quotes";
import { today } from "@/domain/dates";

/** Same 5-step matte amber ramp as the Stats YearHeatmap. */
const RAMP = [
  "rgb(var(--hairline) / 0.06)",
  "rgb(var(--accent) / 0.28)",
  "rgb(var(--accent) / 0.48)",
  "rgb(var(--accent) / 0.70)",
  "rgb(var(--accent) / 1.0)",
];

const GRID_COLS = 12;
const GRID_ROWS = 7;
const CELL = 15;
const GAP = 3;
const STEP = CELL + GAP;

/** Deterministic pseudo-random ramp index so server/client markup matches. */
function levelFor(i: number): number {
  return Math.abs(Math.round(Math.sin(i * 12.9898) * 43758.5453) % RAMP.length);
}

const ACTS = [
  { n: "01", title: "One tap to log", blurb: "No forms, no friction. Tap once and it’s done." },
  { n: "02", title: "Your consistency, drawn", blurb: "A year of showing up, one cell at a time." },
  { n: "03", title: "A pet that lives on your discipline", blurb: "Nix doesn’t perform tricks — it just reflects how you’ve been doing." },
  { n: "04", title: "Words that actually happened", blurb: "Real people, real sources. No fortune-cookie wisdom." },
] as const;

interface ActHeadingProps {
  n: string;
  title: string;
  blurb: string;
}

function ActHeading({ n, title, blurb }: ActHeadingProps) {
  return (
    <div className="max-w-[440px]">
      <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
        {n} / 04
      </span>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight [color:rgb(var(--text))] md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">{blurb}</p>
    </div>
  );
}

/**
 * GSAP ScrollTrigger scroll story: four pinned, scrubbed acts. All timelines
 * are built inside a dynamically-imported, client-only effect (gsap touches
 * `window`/`document`, so it must never execute during SSR) and torn down
 * on unmount via `gsap.context().revert()`. Under reduced-motion, no
 * ScrollTrigger is ever created and a compact static fallback renders
 * instead (settled end-states, normal document flow, no pinning).
 */
export function ScrollStory() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Act 1 — habit card
  const act1Ref = useRef<HTMLDivElement>(null);
  const checkFillRef = useRef<HTMLSpanElement>(null);
  const checkMarkRef = useRef<HTMLSpanElement>(null);
  const streakLabelRef = useRef<HTMLSpanElement>(null);

  // Act 2 — heatmap
  const act2Ref = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<SVGRectElement | null>>([]);

  // Act 3 — pet
  const act3Ref = useRef<HTMLDivElement>(null);
  const [petGlow, setPetGlow] = useState(0.15);

  // Act 4 — quote
  const act4Ref = useRef<HTMLDivElement>(null);
  const quoteSpanRef = useRef<HTMLSpanElement>(null);

  const quote = quoteOfDay(today());

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);
    if (reduced) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      gsap.registerPlugin(ScrollTrigger);
      if (cancelled) return;

      ctx = gsap.context(() => {
        if (act1Ref.current && checkFillRef.current && checkMarkRef.current && streakLabelRef.current) {
          gsap.set(checkFillRef.current, { opacity: 0, scale: 0.7, transformOrigin: "50% 50%" });
          gsap.set(checkMarkRef.current, { opacity: 0 });
          gsap.set(streakLabelRef.current, { opacity: 0, y: 8 });

          gsap
            .timeline({
              scrollTrigger: {
                trigger: act1Ref.current,
                start: "top top",
                end: "+=1200",
                scrub: 0.6,
                pin: true,
              },
            })
            .to(checkFillRef.current, { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, 0.3)
            .to(checkMarkRef.current, { opacity: 1, duration: 0.4 }, 0.5)
            .to(streakLabelRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.68);
        }

        if (act2Ref.current) {
          const cells = cellRefs.current.filter((c): c is SVGRectElement => c !== null);
          gsap.set(cells, { opacity: 0 });
          gsap.timeline({
            scrollTrigger: {
              trigger: act2Ref.current,
              start: "top top",
              end: "+=1500",
              scrub: 0.6,
              pin: true,
            },
          }).to(cells, { opacity: 1, stagger: 0.012, ease: "none" });
        }

        if (act3Ref.current) {
          ScrollTrigger.create({
            trigger: act3Ref.current,
            start: "top top",
            end: "+=1200",
            scrub: 0.6,
            pin: true,
            onUpdate: (self) => setPetGlow(0.15 + self.progress * 0.85),
          });
        }

        if (act4Ref.current && quoteSpanRef.current) {
          const el = quoteSpanRef.current;
          const full = quote.text;
          ScrollTrigger.create({
            trigger: act4Ref.current,
            start: "top top",
            end: "+=1300",
            scrub: 0.6,
            pin: true,
            onUpdate: (self) => {
              const count = Math.round(full.length * self.progress);
              el.textContent = full.slice(0, count);
            },
          });
        }
      }, rootRef);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reducedMotion) {
    return <StaticStory quoteText={quote.text} quoteAuthor={quote.author} quoteSource={quote.source} />;
  }

  return (
    <div ref={rootRef}>
      {/* Act 1 */}
      <section
        ref={act1Ref}
        className="relative flex h-screen w-full items-center border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--bg))]"
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[0]} />
          <div className="mx-auto w-full max-w-[380px]">
            <div className="relative flex items-center gap-3 rounded-2xl border px-5 py-4 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg [background:rgb(var(--surface-2))]"
                aria-hidden="true"
              >
                📚
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] [color:rgb(var(--text))]">Read 20 pages</div>
                <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
                  Daily
                </div>
              </div>
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border [border-color:rgb(var(--hairline)/0.16)]">
                <span
                  ref={checkFillRef}
                  className="absolute inset-0 grid place-items-center rounded-full [background:rgb(var(--accent))]"
                  aria-hidden="true"
                >
                  <span ref={checkMarkRef} className="text-lg [color:rgb(var(--bg))]">
                    &#10003;
                  </span>
                </span>
              </span>
              <span
                ref={streakLabelRef}
                className="absolute -right-2 -top-3 rounded-full border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] [border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface))] [color:rgb(var(--accent))]"
              >
                streak +1
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Act 2 */}
      <section
        ref={act2Ref}
        className="relative flex h-screen w-full items-center border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--bg))]"
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[1]} />
          <div className="mx-auto flex w-full max-w-[420px] justify-center">
            <svg
              width={GRID_COLS * STEP - GAP}
              height={GRID_ROWS * STEP - GAP}
              viewBox={`0 0 ${GRID_COLS * STEP - GAP} ${GRID_ROWS * STEP - GAP}`}
              role="img"
              aria-label="A grid representing months of daily habit consistency"
            >
              {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
                const col = i % GRID_COLS;
                const row = Math.floor(i / GRID_COLS);
                const level = levelFor(i);
                return (
                  <rect
                    key={i}
                    ref={(el) => {
                      cellRefs.current[i] = el;
                    }}
                    x={col * STEP}
                    y={row * STEP}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    ry={3}
                    fill={RAMP[level]}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Act 3 */}
      <section
        ref={act3Ref}
        className="relative flex h-screen w-full items-center border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--bg))]"
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[2]} />
          <div className="mx-auto flex w-full max-w-[380px] items-center justify-center">
            <NixCreature glow={petGlow} state={petGlow >= 0.9 ? "radiant" : "idle"} size={190} />
          </div>
        </div>
      </section>

      {/* Act 4 */}
      <section
        ref={act4Ref}
        className="relative flex h-screen w-full items-center border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--bg))]"
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[3]} />
          <div className="mx-auto w-full max-w-[440px]">
            <p className="text-xl italic leading-relaxed [font-family:'Times_New_Roman',Times,serif] [color:rgb(var(--text))] sm:text-2xl">
              &ldquo;<span ref={quoteSpanRef} />&rdquo;
            </p>
            <p className="mt-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
              {quote.author} &mdash; {quote.source}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Compact, non-pinned fallback for prefers-reduced-motion: settled end-states, normal flow. */
function StaticStory({
  quoteText,
  quoteAuthor,
  quoteSource,
}: {
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string;
}) {
  return (
    <div>
      <section className="border-t py-24 [border-color:rgb(var(--hairline)/0.08)]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[0]} />
          <div className="mx-auto w-full max-w-[380px]">
            <div className="relative flex items-center gap-3 rounded-2xl border px-5 py-4 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg [background:rgb(var(--surface-2))]"
                aria-hidden="true"
              >
                📚
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] [color:rgb(var(--text))]">Read 20 pages</div>
                <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
                  Daily
                </div>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full [background:rgb(var(--accent))] [color:rgb(var(--bg))]">
                &#10003;
              </span>
              <span className="absolute -right-2 -top-3 rounded-full border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] [border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface))] [color:rgb(var(--accent))]">
                streak +1
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t py-24 [border-color:rgb(var(--hairline)/0.08)]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[1]} />
          <div className="mx-auto flex w-full max-w-[420px] justify-center">
            <svg
              width={GRID_COLS * STEP - GAP}
              height={GRID_ROWS * STEP - GAP}
              viewBox={`0 0 ${GRID_COLS * STEP - GAP} ${GRID_ROWS * STEP - GAP}`}
              role="img"
              aria-label="A grid representing months of daily habit consistency"
            >
              {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
                const col = i % GRID_COLS;
                const row = Math.floor(i / GRID_COLS);
                return (
                  <rect
                    key={i}
                    x={col * STEP}
                    y={row * STEP}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    ry={3}
                    fill={RAMP[levelFor(i)]}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      <section className="border-t py-24 [border-color:rgb(var(--hairline)/0.08)]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[2]} />
          <div className="mx-auto flex w-full max-w-[380px] items-center justify-center">
            <NixCreature glow={1} state="radiant" size={190} />
          </div>
        </div>
      </section>

      <section className="border-t py-24 [border-color:rgb(var(--hairline)/0.08)]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-10">
          <ActHeading {...ACTS[3]} />
          <div className="mx-auto w-full max-w-[440px]">
            <p className="text-xl italic leading-relaxed [font-family:'Times_New_Roman',Times,serif] [color:rgb(var(--text))] sm:text-2xl">
              &ldquo;{quoteText}&rdquo;
            </p>
            <p className="mt-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]">
              {quoteAuthor} &mdash; {quoteSource}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

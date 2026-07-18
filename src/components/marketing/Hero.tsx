"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { NixCreature } from "@/components/pet/NixCreature";
import {
  BETA_HERO_FEEDBACK_LEAD,
  BETA_HERO_FEEDBACK_TAIL,
  BETA_HERO_NOTICE,
  BETA_LABEL,
  FEEDBACK_MAILTO,
} from "@/content/beta";
import { MarketingNav } from "./MarketingNav";

/**
 * Full-viewport hero. Left: display headline + subhead + CTAs. Right: Nix
 * on a floating matte slab. Two parallax layers, composed into a single
 * imperative transform per element (no React re-render): cursor parallax on
 * the slab, plus scroll parallax that drifts the slab down and the copy up as
 * the hero scrolls away, giving depth as you leave the screen. Disabled under
 * reduced-motion.
 */
export function Hero() {
  const slabRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const scrollY = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const slab = slabRef.current;
    const copy = copyRef.current;
    if (!slab) return;

    function write() {
      if (!slab) return;
      const s = scrollY.current;
      const { x, y } = mouse.current;
      // slab: cursor drift + a gentle downward scroll lag (moves slower than page)
      slab.style.transform = `translate(${x * 14}px, ${y * 10 + s * 0.18}px)`;
      // copy: rises slightly faster than the page and fades as the hero leaves
      if (copy) {
        copy.style.transform = `translateY(${s * -0.08}px)`;
        copy.style.opacity = String(Math.max(0, 1 - s / 620));
      }
    }

    function schedule() {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(write);
    }

    function handleMove(e: MouseEvent) {
      const { innerWidth, innerHeight } = window;
      mouse.current = {
        x: (e.clientX / innerWidth - 0.5) * 2, // -1..1
        y: (e.clientY / innerHeight - 0.5) * 2,
      };
      schedule();
    }

    function handleScroll() {
      scrollY.current = window.scrollY;
      schedule();
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden [background:rgb(var(--bg))]">
      <MarketingNav />

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-12 px-6 pt-28 pb-16 md:grid-cols-2 md:px-10 md:pt-24">
        <div ref={copyRef} className="max-w-[560px]" style={{ willChange: "transform, opacity" }}>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 [border-color:rgb(var(--hairline)/0.08)]">
            <span
              className="h-1.5 w-1.5 rounded-full [background:rgb(var(--accent))]"
              aria-hidden="true"
            />
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-dim))]">
              {BETA_LABEL}
            </span>
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[1.03] tracking-tight [color:rgb(var(--text))]">
            Habits are boring.
            <br />
            Keeping them shouldn&rsquo;t be.
          </h1>

          <p className="mt-6 max-w-[440px] text-lg leading-relaxed [color:rgb(var(--text-dim))]">
            Nitor is a quiet, honest habit tracker &mdash; one tap to log, a
            forgiving streak, and a companion that only ever reflects what
            you actually did.
          </p>

          <p className="mt-5 max-w-[460px] text-[13px] leading-relaxed [color:rgb(var(--text-mute))]">
            {BETA_HERO_NOTICE}{" "}
            <a
              href={FEEDBACK_MAILTO}
              className="underline decoration-[rgb(var(--hairline)/0.3)] underline-offset-2 transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              {BETA_HERO_FEEDBACK_LEAD}
            </a>{" "}
            {BETA_HERO_FEEDBACK_TAIL}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-full px-6 py-3.5 text-[15px] font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.98] [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="text-[15px] [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              Log in &rarr;
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div
            ref={slabRef}
            className="relative flex items-center justify-center rounded-[28px] border p-16 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
            style={{ willChange: "transform" }}
          >
            <NixCreature glow={0.8} state="radiant" size={220} />
          </div>
        </div>
      </div>
    </section>
  );
}

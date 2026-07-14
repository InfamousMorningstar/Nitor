"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { NixCreature } from "@/components/pet/NixCreature";
import { MarketingNav } from "./MarketingNav";

/**
 * Full-viewport hero. Left: display headline + subhead + CTAs. Right: Nix
 * on a floating matte slab with subtle cursor-parallax. Parallax is applied
 * imperatively (direct style writes on rAF) rather than via React state, so
 * mousemove never triggers a re-render. Disabled under reduced-motion.
 */
export function Hero() {
  const slabRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const slab = slabRef.current;
    if (!slab) return;

    function handleMove(e: MouseEvent) {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const { innerWidth, innerHeight } = window;
        const x = (e.clientX / innerWidth - 0.5) * 2; // -1..1
        const y = (e.clientY / innerHeight - 0.5) * 2;
        if (slab) {
          slab.style.transform = `translate(${x * 14}px, ${y * 10}px)`;
        }
      });
    }

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden [background:rgb(var(--bg))]">
      <MarketingNav />

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-12 px-6 pt-28 pb-16 md:grid-cols-2 md:px-10 md:pt-24">
        <div className="max-w-[560px]">
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

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-full px-6 py-3.5 text-[15px] font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.98] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
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

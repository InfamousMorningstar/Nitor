"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { NixCreature } from "@/components/pet/NixCreature";
import { QUOTES } from "@/domain/quotes";
import { useSettingsStore } from "@/state/settingsStore";

const ROTATE_MS = 6000;

/**
 * Shared logged-out shell for auth pages — outside AppFrame, no sidebar.
 * Left ~45%: matte form column with the wordmark. Right ~55% (lg+ only):
 * a flat panel with the sanctioned Nix glow and a rotating authentic
 * quote. Rotation respects both the OS-level prefers-reduced-motion query
 * and the user's Settings → Reduce motion override.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const reduceMotionSetting = useSettingsStore((s) => s.reduceMotion);
  const [reduceMotion, setReduceMotion] = useState(reduceMotionSetting);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(reduceMotionSetting || mq.matches);
  }, [reduceMotionSetting]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const quote = QUOTES[index];

  return (
    <div className="flex min-h-screen w-full [background:rgb(var(--bg))]">
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 sm:py-10 lg:w-[45%] lg:px-16">
        <Link href="/today" className="inline-block w-fit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--accent))]">
          <Wordmark size="text-xl" className="[color:rgb(var(--text))]" />
        </Link>

        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>

      <div className="relative hidden w-[55%] flex-col items-center justify-center gap-10 border-l px-16 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] lg:flex">
        <NixCreature glow={0.7} state="idle" size={220} />

        <div className="max-w-[440px] text-center" aria-live={reduceMotion ? undefined : "polite"}>
          <p className="text-2xl italic leading-relaxed [font-family:'Times_New_Roman',Times,serif] [color:rgb(var(--text))]">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="mt-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
            {quote.author} &mdash; {quote.source}
          </p>
        </div>
      </div>
    </div>
  );
}

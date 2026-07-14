import Link from "next/link";
import { Glitch } from "@/components/brand/Glitch";

/**
 * Nitor's 404 — the fourth and final sanctioned glitch moment (see
 * DESIGN.md). A single `<Glitch>` plays once on the mirrored Я as the page
 * mounts; the "404" numerals themselves are never glitched. Matte, one
 * accent, no chrome — this route can be hit by signed-out visitors too, so
 * it stands alone rather than assuming the app shell.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-6 text-center [background:rgb(var(--bg))]">
      <h1 className="sr-only">Page not found</h1>

      <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] [color:rgb(var(--text-mute))]">
        404
      </span>

      <span
        className="inline-block font-[family-name:var(--font-display)] text-[clamp(6rem,18vw,10rem)] font-medium leading-none [transform:scaleX(-1)] [color:rgb(var(--text))]"
        aria-hidden="true"
      >
        <Glitch trigger>R</Glitch>
      </span>

      <p className="max-w-[420px] text-xl italic leading-relaxed [font-family:'Times_New_Roman',Times,serif] [color:rgb(var(--text-dim))]">
        This page never formed a habit. It isn&rsquo;t here.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/today"
          className="rounded-full px-6 py-3.5 text-[15px] font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.98] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          Back to Today
        </Link>
        <Link
          href="/"
          className="text-[15px] [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

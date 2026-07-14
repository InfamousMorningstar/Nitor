import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { LiquidThemeToggle } from "@/components/ui/LiquidThemeToggle";

/**
 * Top nav for the logged-out marketing page. Flat, transparent-over-bg,
 * no glass. No Glitch here — the app's Glitch budget (see DESIGN.md) is
 * already spent on Sidebar nav-hover / loader / 404; this page's slot is
 * the footer Я. Deliberately quiet: wordmark + the light/dark switch only.
 * Both auth actions (Start free / Log in) live together in the hero, so the
 * top bar stays editorial rather than competing for the eye.
 */
export function MarketingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 md:px-10">
        <Link
          href="/"
          aria-label="Nitor home"
          className="inline-block [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)]"
        >
          <Wordmark size="text-xl" />
        </Link>

        <LiquidThemeToggle />
      </div>
    </header>
  );
}

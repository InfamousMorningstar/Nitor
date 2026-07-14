import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Top nav for the logged-out marketing page. Flat, transparent-over-bg,
 * no glass. No Glitch here — the app's Glitch budget (see DESIGN.md) is
 * already spent on Sidebar nav-hover / loader / 404; this page's slot is
 * the footer Я.
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

        <nav className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full px-4 py-2 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.98] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

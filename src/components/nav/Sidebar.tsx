"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { Glitch } from "@/components/brand/Glitch";
import { BetaChip } from "@/components/ui/BetaChip";
import { useSession } from "@/state/SessionProvider";
import { NAV_ITEMS } from "./navItems";

/**
 * Desktop-first primary nav — a fixed flat left rail, md+ only. Below the
 * md breakpoint the TabBar (see TabBar.tsx) takes over. Flat matte surface,
 * no glass, one accent for the active state.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useSession();
  const label = profile?.display_name || user?.email || "You";
  const initial = label.charAt(0).toUpperCase();
  return (
    <div className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <Link href="/today" aria-label="Nitor home" className="inline-block [color:rgb(var(--text))]">
          <Wordmark size="text-xl" />
        </Link>
        <BetaChip />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex items-center gap-3 border-l-2 px-4 py-2.5 transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] " +
                (active
                  ? "border-l-[rgb(var(--accent))] [color:rgb(var(--accent))]"
                  : "border-l-transparent [color:rgb(var(--text-dim))] hover:[color:rgb(var(--accent))]")
              }
            >
              <Icon />
              <span className="text-[14px] font-[family-name:var(--font-geist-sans)]">
                <Glitch>{label}</Glitch>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t px-6 py-5 [border-color:rgb(var(--hairline)/0.08)]">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium [background:rgb(var(--surface-2))] [color:rgb(var(--text-dim))]"
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="truncate text-sm [color:rgb(var(--text-dim))]" title={label}>
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 text-xs [color:rgb(var(--text-mute))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] rounded-sm"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

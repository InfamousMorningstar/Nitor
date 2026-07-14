"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

/**
 * Mobile fallback nav — flat bottom bar, <768px only. Desktop uses the
 * fixed Sidebar instead (see Sidebar.tsx). Both source their items from
 * navItems.tsx so the destinations and icons stay in sync.
 *
 * Flat matte only — no glass, no glitch (budget is spent on the Sidebar
 * hover already).
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] md:hidden">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors duration-[var(--dur-micro)] " +
              (active ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--text-dim))]")
            }
          >
            <Icon />
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

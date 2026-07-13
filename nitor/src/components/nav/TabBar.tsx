"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glass } from "@/components/glass/Glass";
import { NAV_ITEMS } from "./navItems";

/**
 * Mobile fallback nav — floating bottom bar, <768px only. Desktop uses the
 * fixed glass Sidebar instead (see Sidebar.tsx). Both source their items
 * from navItems.tsx so the destinations and icons stay in sync.
 */
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:hidden">
      <Glass className="px-2 py-2">
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex flex-col items-center gap-1.5 rounded-2xl px-4 py-2 transition-colors " +
                    (active ? "[color:rgb(var(--nitor))]" : "[color:rgb(var(--muted))]")
                  }
                >
                  <Icon />
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-wide">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Glass>
    </nav>
  );
}

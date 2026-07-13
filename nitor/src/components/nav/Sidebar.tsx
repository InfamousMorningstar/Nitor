"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glass } from "@/components/glass/Glass";
import { NAV_ITEMS } from "./navItems";

/**
 * Desktop-first primary nav — a fixed glass left sidebar, md+ only. Below
 * the md breakpoint the floating TabBar (see TabBar.tsx) takes over.
 */
export function Sidebar() {
  const path = usePathname();
  return (
    <div className="fixed left-0 top-0 z-40 hidden h-screen w-60 p-4 md:flex">
      <Glass as="nav" className="flex h-full w-full flex-col px-4 py-6">
        <Link
          href="/today"
          className="mb-8 block font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight"
        >
          Nitor
        </Link>
        <ul className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors " +
                    (active
                      ? "[color:rgb(var(--nitor))] [background:rgb(var(--nitor)/0.12)]"
                      : "[color:rgb(var(--muted))] hover:[color:rgb(var(--text))]")
                  }
                >
                  <Icon />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Glass>
    </div>
  );
}

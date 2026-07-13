"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import { Glass } from "@/components/glass/Glass";

/**
 * Minimal, cohesive line-icon set (~20px, currentColor stroke) standing in
 * for crude unicode glyphs. Each icon shares the same stroke weight and
 * rounded caps so the set reads as one family, SF-symbol style.
 */
function IconToday(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5.5" y1="5.5" x2="7.2" y2="7.2" />
      <line x1="16.8" y1="16.8" x2="18.5" y2="18.5" />
      <line x1="5.5" y1="18.5" x2="7.2" y2="16.8" />
      <line x1="16.8" y1="7.2" x2="18.5" y2="5.5" />
    </svg>
  );
}

function IconInsights(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3,17 9,11 13,15 21,5" />
      <polyline points="15,5 21,5 21,11" />
    </svg>
  );
}

function IconHabits(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="4.5" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <circle cx="4.5" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <circle cx="4.5" cy="18" r="1.15" fill="currentColor" stroke="none" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="15" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="9" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  );
}

const TABS = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/insights", label: "Insights", Icon: IconInsights },
  { href: "/habits", label: "Habits", Icon: IconHabits },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <Glass className="px-2 py-2">
        <ul className="flex items-center gap-1">
          {TABS.map(({ href, label, Icon }) => {
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

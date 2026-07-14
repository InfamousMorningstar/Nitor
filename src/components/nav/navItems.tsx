import type { SVGProps } from "react";

/**
 * Minimal, cohesive line-icon set (~20px, currentColor stroke) standing in
 * for crude unicode glyphs. Each icon shares the same stroke weight and
 * rounded caps so the set reads as one family, SF-symbol style.
 *
 * Single source of truth for nav destinations — used by both the desktop
 * Sidebar and the mobile TabBar.
 */
export function IconToday(props: SVGProps<SVGSVGElement>) {
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

export function IconStats(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="2.5" y1="20.5" x2="21.5" y2="20.5" />
      <line x1="5.5" y1="20" x2="5.5" y2="12" />
      <line x1="12" y1="20" x2="12" y2="5.5" />
      <line x1="18.5" y1="20" x2="18.5" y2="14.5" />
    </svg>
  );
}

export function IconInsights(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3,17 9,11 13,15 21,5" />
      <polyline points="15,5 21,5 21,11" />
    </svg>
  );
}

export function IconHabits(props: SVGProps<SVGSVGElement>) {
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

export function IconPet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="15" r="4.4" />
      <circle cx="5.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSettings(props: SVGProps<SVGSVGElement>) {
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

export interface NavItem {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", Icon: IconToday },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/insights", label: "Insights", Icon: IconInsights },
  { href: "/habits", label: "Habits", Icon: IconHabits },
  { href: "/pet", label: "Pet", Icon: IconPet },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

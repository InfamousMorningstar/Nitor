"use client";
import { useTheme } from "@/state/theme";
import styles from "./LiquidThemeToggle.module.css";

/**
 * Liquid gooey light/dark switch (adapted from uiverse.io/Bodyhc/light-lion-39).
 * Wired to the app theme: checked = dark. The switch colours + blend mode flip
 * per theme (see the .module.css) so the metaball stays visible on both the
 * paper and ink footers. Accessible: it's a real checkbox with role="switch",
 * an sr-only label, and a focus ring on the wrapper (the filtered input can't
 * carry a clean outline).
 */
export function LiquidThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <label className={styles.wrap} title="Toggle light / dark">
      <span className="sr-only">Toggle light and dark theme</span>
      <SunIcon className={`${styles.icon} ${isDark ? "" : styles.iconOn}`} />
      <input
        type="checkbox"
        role="switch"
        aria-label="Toggle light and dark theme"
        aria-checked={isDark}
        checked={isDark}
        onChange={() => setTheme(isDark ? "light" : "dark")}
        className={`${styles.toggle} ${isDark ? styles.dark : ""}`}
      />
      <MoonIcon className={`${styles.icon} ${isDark ? styles.iconOn : ""}`} />
    </label>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

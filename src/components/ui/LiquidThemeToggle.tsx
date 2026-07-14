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
      <input
        type="checkbox"
        role="switch"
        aria-label="Toggle light and dark theme"
        aria-checked={isDark}
        checked={isDark}
        onChange={() => setTheme(isDark ? "light" : "dark")}
        className={`${styles.toggle} ${isDark ? styles.dark : ""}`}
      />
    </label>
  );
}

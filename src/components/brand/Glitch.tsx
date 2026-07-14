"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Glitch.module.css";

/**
 * Glitch — text wrapper that plays a single, brief RGB channel-split +
 * slice offset, then resolves crisp.
 *
 * By default the glitch fires on `:hover` (pure CSS, no JS needed). Pass
 * `trigger` (any value that changes, or toggles true) to fire a one-shot
 * glitch imperatively — useful for a loader or an on-mount 404 flourish.
 *
 * Respects `prefers-reduced-motion`: the effect is fully disabled and only
 * the plain text renders.
 *
 * Budget: exactly four uses across the app (nav hover, loader, footer,
 * 404). See DESIGN.md.
 */

interface GlitchProps {
  children: string;
  /** Fire a one-shot glitch when this becomes truthy. */
  trigger?: boolean;
  className?: string;
}

export function Glitch({ children, trigger, className = "" }: GlitchProps) {
  const [playing, setPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!trigger) return;
    setPlaying(true);
    timeoutRef.current = setTimeout(() => setPlaying(false), 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trigger]);

  return (
    <span
      className={`${styles.wrap} ${playing ? styles.play : ""} ${className}`}
      data-text={children}
    >
      {children}
    </span>
  );
}

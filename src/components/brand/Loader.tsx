"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./Loader.module.css";

/**
 * Loader — full-viewport cold-boot splash. NITOR materializes letter by
 * letter with a restrained glitch, the final R flickers and settles
 * mirrored (Я), a 1px accent underline draws beneath, then the mark
 * scales down and fades to reveal the app underneath.
 *
 * Shown exactly once per browser tab session, on a cold load only — a
 * `sessionStorage` flag is set once the sequence finishes (or is skipped)
 * so client-side route changes never replay it (the component itself only
 * mounts once anyway, since it lives in the root layout above the router).
 *
 * Skippable at any point via click/tap or keypress. Fully replaced by a
 * single 300ms fade of the static, already-mirrored wordmark under
 * `prefers-reduced-motion`, per the app's four-use glitch budget (see
 * DESIGN.md).
 *
 * DOM/sessionStorage access is gated to `useEffect` so this never runs
 * during SSR and never causes a hydration mismatch — the component simply
 * renders nothing until the effect decides whether to play.
 */

const STORAGE_KEY = "nitor.booted";
const LETTERS = ["N", "I", "T", "O"] as const;
const LETTER_STAGGER = 70; // ms between each letter's materialize start
const FLICKER_AT = 420; // ms — R flicker + mirror settle begins (underline follows, see CSS delay)
const DISMISS_AT = 1250; // ms — scale-down + fade begins
const DISMISS_DUR = 550; // ms
const TOTAL_MS = DISMISS_AT + DISMISS_DUR; // ~1800ms, under the 2s ceiling
const REDUCED_FADE_MS = 300;
const REDUCED_TOTAL_MS = 600;

type Stage = "materializing" | "settled" | "dismissing";

export function Loader() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [stage, setStage] = useState<Stage>("materializing");
  const [reduced, setReduced] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      alreadyBooted = false;
    }
    if (alreadyBooted) return; // played already this tab session — never replay

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reducedMotion);
    setMounted(true);

    function schedule(fn: () => void, ms: number) {
      timers.current.push(setTimeout(fn, ms));
    }

    function markBooted() {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* sessionStorage unavailable (private mode, etc) — degrade gracefully */
      }
    }

    function finish() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      markBooted();
      setHidden(true);
    }

    if (reducedMotion) {
      schedule(() => setStage("dismissing"), REDUCED_FADE_MS);
      schedule(finish, REDUCED_TOTAL_MS);
    } else {
      schedule(() => setStage("settled"), FLICKER_AT);
      schedule(() => setStage("dismissing"), DISMISS_AT);
      schedule(finish, TOTAL_MS);
    }

    function handleSkip() {
      finish();
    }
    window.addEventListener("pointerdown", handleSkip);
    window.addEventListener("keydown", handleSkip);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("pointerdown", handleSkip);
      window.removeEventListener("keydown", handleSkip);
    };
  }, []);

  if (!mounted || hidden) return null;

  return (
    <div
      className={`${styles.overlay} ${stage === "dismissing" ? styles.dismissing : ""}`}
      role="presentation"
      aria-hidden="true"
    >
      {reduced ? (
        <span className={styles.staticWordmark}>
          NITO
          <span className={styles.mirrorR}>R</span>
        </span>
      ) : (
        <div className={styles.wordmarkGroup}>
          <span className={styles.wordmark}>
            {LETTERS.map((ch, i) => (
              <span
                key={ch + i}
                className={styles.letter}
                data-text={ch}
                style={{ "--d": `${i * LETTER_STAGGER}ms` } as CSSProperties}
              >
                {ch}
              </span>
            ))}
            <span
              className={`${styles.letter} ${styles.rLetter} ${
                stage === "settled" || stage === "dismissing" ? styles.rMirrored : ""
              }`}
              data-text="R"
              style={{ "--d": `${LETTERS.length * LETTER_STAGGER}ms` } as CSSProperties}
            >
              R
            </span>
          </span>
          <span
            className={`${styles.underline} ${
              stage === "settled" || stage === "dismissing" ? styles.underlineDraw : ""
            }`}
          />
        </div>
      )}
      <span className={styles.skipHint}>Press any key to skip</span>
    </div>
  );
}

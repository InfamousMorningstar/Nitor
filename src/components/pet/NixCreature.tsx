"use client";

import { useSettingsStore } from "@/state/settingsStore";
import styles from "./NixCreature.module.css";

// PLACEHOLDER — replace with Spline scene / rigged .glb (states idle/eat/happy/sleepy/evolve)
// when the asset is provided. Everything below is a procedural stand-in built from CSS/SVG only.

export type NixState = "idle" | "eat" | "sleepy" | "radiant";

interface NixCreatureProps {
  /** 7-day completion rate, 0..1 — drives the creature's inner glow intensity. */
  glow: number;
  state?: NixState;
  /** Body diameter in px. */
  size?: number;
  className?: string;
}

/**
 * Nix — a soft bioluminescent blob whose amber inner glow intensity is
 * literally the 7-day completion rate. This is the ONE place in the app
 * allowed to use luminous accent/blur, per DESIGN.md: the glow IS the pet.
 * Idle bob is disabled when Settings → petAnimation is off, or under
 * reduce-motion (handled globally + inside NixCreature.module.css).
 */
export function NixCreature({ glow, state = "idle", size = 220, className = "" }: NixCreatureProps) {
  const petAnimation = useSettingsStore((s) => s.petAnimation);
  const spriteMode = useSettingsStore((s) => s.petSpriteMode);

  const g = Math.min(1, Math.max(0, glow));
  const innerAlpha = (0.18 + g * 0.72).toFixed(2);
  const ringAlpha = (0.1 + g * 0.35).toFixed(2);
  const glowBlur = Math.round(18 + g * 34);

  const animate = petAnimation;
  const bodyClass = [
    styles.body,
    animate && state === "sleepy" ? styles.bobSleepy : "",
    animate && state !== "sleepy" ? styles.bob : "",
    animate && state === "eat" ? styles.eatPulse : "",
  ]
    .filter(Boolean)
    .join(" ");

  const eyeHeight = state === "sleepy" ? 2 : 7;
  const eyeRadius = state === "sleepy" ? 1 : 4;

  if (spriteMode) {
    // Flat, lower-detail sprite: no blur, no gradients — a plain glowing tile.
    return (
      <div
        className={`${styles.wrap} ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Nix, glowing at ${Math.round(g * 100)}%`}
      >
        <div
          className={bodyClass}
          style={{
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: 20,
            background: "rgb(var(--surface-2))",
            border: `2px solid rgb(var(--accent) / ${ringAlpha})`,
            boxShadow: `0 0 0 6px rgb(var(--accent-glow) / ${(g * 0.12).toFixed(2)})`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: size * 0.1 }}>
            <span
              style={{
                width: 8,
                height: eyeHeight,
                borderRadius: eyeRadius,
                background: "rgb(var(--text-dim))",
                display: "block",
              }}
            />
            <span
              style={{
                width: 8,
                height: eyeHeight,
                borderRadius: eyeRadius,
                background: "rgb(var(--text-dim))",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.wrap} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Nix, glowing at ${Math.round(g * 100)}%`}
    >
      {state === "radiant" && (
        <div
          className={animate ? styles.radiantRing : ""}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: "50%",
            border: `1px solid rgb(var(--accent) / ${ringAlpha})`,
          }}
        />
      )}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgb(var(--accent-glow) / ${(g * 0.5).toFixed(2)}), transparent 70%)`,
          filter: `blur(${glowBlur}px)`,
        }}
      />

      <div
        className={bodyClass}
        style={{
          width: size * 0.68,
          height: size * 0.62,
          borderRadius: "42% 58% 55% 45% / 45% 40% 60% 55%",
          background: "rgb(var(--surface-2))",
          boxShadow: `inset 0 0 0 1px rgb(var(--hairline) / 0.08), 0 0 ${Math.round(g * 30)}px rgb(var(--accent-glow) / ${(g * 0.3).toFixed(2)})`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: `radial-gradient(circle at 42% 36%, rgb(var(--accent-glow) / ${innerAlpha}), transparent 68%)`,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "42%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            gap: size * 0.09,
          }}
        >
          <span
            style={{
              width: 7,
              height: eyeHeight,
              borderRadius: eyeRadius,
              background: "rgb(var(--bg))",
              display: "block",
            }}
          />
          <span
            style={{
              width: 7,
              height: eyeHeight,
              borderRadius: eyeRadius,
              background: "rgb(var(--bg))",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useId } from "react";
import { useSettingsStore } from "@/state/settingsStore";
import styles from "./NixCreature.module.css";

// Original layered-SVG creature (CC0 — hand-authored, no external assets).
// A Spline/.glb rigged scene can swap in later for the body without
// changing this component's public API (glow/state/equipped/size/spriteMode).

export type NixState = "idle" | "happy" | "sleepy" | "eating" | "radiant";
/** Legacy alias accepted for older call sites — treated as "eating". */
type LegacyNixState = "eat";

/** Wardrobe ids — must match `src/domain/pet.ts` WARDROBE_ITEMS. */
export type NixAccessory = "none" | "halo" | "embers" | "aurora" | "crown" | (string & {});

interface NixCreatureProps {
  /** 0..1 — drives the creature's bioluminescent glow intensity. Defaults to a soft mid glow. */
  glow?: number;
  state?: NixState | LegacyNixState;
  /** Currently equipped wardrobe item id — see domain/pet.ts WARDROBE_ITEMS. */
  equipped?: NixAccessory;
  /** Body diameter in px. */
  size?: number;
  /** Force sprite (flat, low-power) mode. Defaults to settingsStore.petSpriteMode when omitted. */
  spriteMode?: boolean;
  className?: string;
}

const BODY_PATH =
  "M100,36 C124,34 148,46 156,72 C164,98 162,128 144,150 C126,172 98,180 74,170 " +
  "C50,160 34,138 34,110 C34,82 48,56 72,44 C82,39 90,37 100,36 Z";

/** A soft, larger silhouette used only by the "aurora" cosmetic layer. */
const AURORA_PATH =
  "M100,24 C130,22 160,40 168,72 C176,104 172,136 150,160 C128,184 92,190 64,176 " +
  "C36,162 20,132 24,100 C28,68 48,38 78,28 C85,25 92,24 100,24 Z";

/**
 * Nix — a soft bioluminescent blob whose glow intensity is driven by the
 * `glow` prop (0..1, typically the 7-day completion rate). This is the ONE
 * place in the app allowed to use luminous accent + blur, per DESIGN.md:
 * the glow IS the pet. Wardrobe accessory layers are flat/matte cosmetics
 * (no blur of their own) so they stay consistent with the rest of the app.
 *
 * Motion is pure CSS keyframes keyed off a `data-state` attribute, and is
 * disabled whenever Settings → petAnimation is off or under OS-level
 * prefers-reduced-motion (see NixCreature.module.css).
 */
export function NixCreature({
  glow = 0.5,
  state = "idle",
  equipped = "none",
  size = 220,
  spriteMode,
  className = "",
}: NixCreatureProps) {
  const petAnimation = useSettingsStore((s) => s.petAnimation);
  const storeSpriteMode = useSettingsStore((s) => s.petSpriteMode);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const sprite = spriteMode ?? storeSpriteMode;
  const animate = petAnimation;
  const g = Math.min(1, Math.max(0, glow));
  const nixState: NixState = state === "eat" ? "eating" : (state as NixState);

  const glowRadius = Math.round(58 + g * 42);
  const glowOpacity = (0.12 + g * 0.45 + (nixState === "radiant" ? 0.15 : 0)).toFixed(2);
  const blurStd = Math.round(14 + g * 18);
  const innerAlpha = Math.min(0.85, 0.18 + g * 0.55).toFixed(2);

  const eyeCy = nixState === "sleepy" ? 108 : 100;
  const eyeRy = nixState === "sleepy" ? 2 : nixState === "eating" ? 7 : 9;
  const eyeRx = nixState === "sleepy" ? 8 : 6.5;

  const filterId = `nix-glow-${uid}`;
  const sheenId = `nix-sheen-${uid}`;

  const stageClass = animate ? styles.stage : styles.stageStatic;
  const glowClass = animate ? styles.glow : styles.glowStatic;

  return (
    <div
      className={`${styles.wrap} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Nix — ${nixState}, glowing at ${Math.round(g * 100)}%${
        equipped !== "none" ? `, wearing ${equipped}` : ""
      }`}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" data-state={nixState}>
        {!sprite && (
          <defs>
            <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation={blurStd} />
            </filter>
            <radialGradient id={sheenId} cx="42%" cy="34%" r="65%">
              <stop offset="0%" stopColor="rgb(var(--accent-glow))" stopOpacity={innerAlpha} />
              <stop offset="100%" stopColor="rgb(var(--accent-glow))" stopOpacity="0" />
            </radialGradient>
          </defs>
        )}

        {/* The one sanctioned luminous accent in this component: the pet's own glow. */}
        {!sprite && (
          <circle
            className={glowClass}
            data-state={nixState}
            cx="100"
            cy="112"
            r={glowRadius}
            fill="rgb(var(--accent-glow))"
            opacity={glowOpacity}
            filter={`url(#${filterId})`}
          />
        )}

        <g className={stageClass} data-state={nixState}>
          {/* Aurora cosmetic — flat cool-tinted silhouette behind the body, no blur. */}
          {equipped === "aurora" && (
            <path d={AURORA_PATH} fill="rgb(125 190 255)" opacity={0.2} aria-hidden="true" />
          )}

          <path d={BODY_PATH} fill="rgb(var(--surface-2))" />
          {!sprite && <path d={BODY_PATH} fill={`url(#${sheenId})`} />}
          {sprite && (
            <path
              d={BODY_PATH}
              fill="none"
              stroke={`rgb(var(--accent) / ${(0.15 + g * 0.4).toFixed(2)})`}
              strokeWidth={3}
            />
          )}

          {/* Halo cosmetic — crisp ring, no blur. */}
          {equipped === "halo" && (
            <g className={animate && !sprite ? styles.halo : ""} aria-hidden="true">
              <ellipse cx="100" cy="30" rx="32" ry="9" fill="none" stroke="rgb(var(--accent))" strokeWidth="4" />
              <ellipse
                cx="100"
                cy="30"
                rx="25"
                ry="6"
                fill="none"
                stroke="rgb(var(--accent-glow))"
                strokeWidth="2"
                opacity="0.6"
              />
            </g>
          )}

          {/* Crown cosmetic — flat five-point crown with jewel dots. */}
          {equipped === "crown" && (
            <g aria-hidden="true">
              <path
                d="M66,40 L74,20 L88,34 L100,16 L112,34 L126,20 L134,40 Z"
                fill="rgb(var(--accent))"
              />
              <circle cx="74" cy="20" r="3.5" fill="rgb(var(--accent-glow))" />
              <circle cx="100" cy="16" r="4" fill="rgb(var(--accent-glow))" />
              <circle cx="126" cy="20" r="3.5" fill="rgb(var(--accent-glow))" />
            </g>
          )}

          {/* Ember trail cosmetic — small rising flame particles. */}
          {(equipped === "embers" || equipped === "ember") && (
            <g aria-hidden="true">
              {[
                { x: 52, y: 168, s: 7, d: "0ms" },
                { x: 42, y: 150, s: 5, d: "260ms" },
                { x: 150, y: 170, s: 6, d: "140ms" },
                { x: 160, y: 150, s: 4.5, d: "380ms" },
              ].map((p, i) => (
                <path
                  key={i}
                  className={animate && !sprite ? styles.ember : ""}
                  style={{ animationDelay: p.d, transformOrigin: `${p.x}px ${p.y}px` }}
                  d={`M${p.x},${p.y + p.s} C${p.x - p.s},${p.y} ${p.x - p.s},${p.y - p.s} ${p.x},${p.y - p.s * 1.6} C${p.x + p.s},${p.y - p.s} ${p.x + p.s},${p.y} ${p.x},${p.y + p.s} Z`}
                  fill="rgb(var(--accent))"
                  opacity={0.85}
                />
              ))}
            </g>
          )}

          {/* Eyes */}
          <g aria-hidden="true">
            <ellipse cx="78" cy={eyeCy} rx={eyeRx} ry={eyeRy} fill="rgb(var(--text-dim))" />
            <ellipse cx="122" cy={eyeCy} rx={eyeRx} ry={eyeRy} fill="rgb(var(--text-dim))" />
          </g>

          {/* Mouth — only while eating */}
          {nixState === "eating" && (
            <ellipse
              className={animate && !sprite ? styles.mouth : ""}
              data-state={nixState}
              cx="100"
              cy="130"
              rx="9"
              ry="6"
              fill="rgb(var(--bg))"
              aria-hidden="true"
            />
          )}

          {/* Happy smile */}
          {nixState === "happy" && (
            <path
              d="M84,126 Q100,138 116,126"
              fill="none"
              stroke="rgb(var(--text-dim))"
              strokeWidth="3.5"
              strokeLinecap="round"
              aria-hidden="true"
            />
          )}

          {/* Sleepy "z"s */}
          {nixState === "sleepy" && (
            <g aria-hidden="true" fill="rgb(var(--text-mute))" fontFamily="var(--font-mono, monospace)" fontWeight="700">
              <text className={animate ? styles.z1 : ""} x="130" y="58" fontSize="14">
                z
              </text>
              <text className={animate ? styles.z2 : ""} x="144" y="44" fontSize="10">
                z
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

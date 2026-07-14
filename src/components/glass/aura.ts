/**
 * Momentum Aura helper.
 *
 * Nitor's signature visual element: a soft radial light behind the glass
 * whose warmth and brightness are driven by a habit's momentum (0-100).
 *
 * - 0-33  (resting):  dim, cool teal glow.
 * - 34-66 (building):  balanced, neutral-warm.
 * - 67-100 (radiant): bright warm amber-gold glow.
 */
export interface Aura {
  from: string;
  to: string;
  opacity: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function auraFor(momentum: number): Aura {
  const m = clamp(momentum, 0, 100);

  const opacity = Math.round((0.12 + (m / 100) * 0.28) * 100) / 100;

  if (m >= 67) {
    return { from: "var(--nitor)", to: "var(--nitor-2)", opacity };
  }
  if (m >= 34) {
    return { from: "var(--nitor)", to: "var(--calm)", opacity };
  }
  return { from: "var(--calm)", to: "var(--calm-2)", opacity };
}

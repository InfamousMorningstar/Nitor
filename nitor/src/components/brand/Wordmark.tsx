/**
 * Wordmark — NITOR rendered as NITOЯ.
 *
 * The final "R" is horizontally mirrored, a permanent brand quirk. Set in
 * the display face (Space Grotesk), uppercase, tight tracking. See
 * DESIGN.md for the rationale.
 */

interface WordmarkProps {
  /** Tailwind text-size class, e.g. "text-2xl". Defaults to "text-xl". */
  size?: string;
  className?: string;
}

export function Wordmark({ size = "text-xl", className = "" }: WordmarkProps) {
  return (
    <span
      className={`${size} ${className} inline-flex items-baseline font-[family-name:var(--font-display)] font-medium uppercase tracking-tight`}
      style={{ letterSpacing: "-0.02em" }}
      aria-label="NITOR"
    >
      NITO
      <span aria-hidden="true" style={{ display: "inline-block", transform: "scaleX(-1)" }}>
        R
      </span>
    </span>
  );
}

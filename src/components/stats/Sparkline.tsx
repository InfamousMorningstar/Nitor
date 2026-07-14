interface SparklineProps {
  /** Per-day 0/1 completion values, oldest first. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny axis-free trend line for a single habit's recent completion. Purely
 * decorative alongside the mono streak/percent readouts in a sparkrow, so
 * it is marked aria-hidden — the meaningful numbers live in text.
 */
export function Sparkline({ values, width = 96, height = 28, className }: SparklineProps) {
  if (values.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" className={className} />;
  }

  const n = values.length;
  const pad = 2;
  const points = values.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = height - pad - v * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={`block ${className ?? ""}`}
    >
      <path
        d={`M${points.join(" L")}`}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MomentumBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full [background:rgb(var(--muted)/0.16)]"
      aria-hidden={false}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.max(4, Math.min(100, value))}%`, background: color }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

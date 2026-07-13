"use client";

/**
 * Curated per-habit color palette. Used ONLY as a 3px left edge on habit
 * rows (and later charts) — never as a background or glow. The picker
 * itself renders flat swatches; the selected swatch is ringed in the
 * app's single accent color, not the swatch's own color.
 */
const COLORS = [
  { hex: "#F5B841", name: "amber" },
  { hex: "#5AD1B4", name: "teal" },
  { hex: "#7FA6FF", name: "blue" },
  { hex: "#FF8E6B", name: "coral" },
  { hex: "#C69CF0", name: "violet" },
  { hex: "#8FD16A", name: "green" },
  { hex: "#F58AB0", name: "rose" },
  { hex: "#57C6E0", name: "sky" },
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div role="listbox" aria-label="Edge color" className="flex flex-wrap gap-2">
      {COLORS.map(({ hex, name }) => {
        const selected = value.toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(hex)}
            aria-label={`color ${name}`}
            className={
              "h-8 w-8 shrink-0 rounded-full transition-transform duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
              (selected ? "ring-2 ring-[rgb(var(--accent))] ring-offset-2 ring-offset-[rgb(var(--surface))]" : "")
            }
            style={{ background: hex }}
          />
        );
      })}
    </div>
  );
}

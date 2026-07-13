"use client";

/**
 * Retuned, luminous jewel-tone habit palette — per the Nitor Design
 * Direction. Not stock primaries.
 */
const COLORS = [
  "#F5B841", // amber
  "#5AD1B4", // teal
  "#7FA6FF", // periwinkle
  "#FF8E6B", // coral
  "#C69CF0", // soft violet
  "#8FD16A", // leaf
  "#F58AB0", // rose
  "#57C6E0", // sky
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => {
        const selected = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={selected}
            aria-label={`color ${c}`}
            className={
              "h-9 w-9 rounded-full transition-transform duration-150 active:scale-[0.97] " +
              (selected ? "ring-2 ring-offset-2 ring-[rgb(var(--nitor))] ring-offset-[rgb(var(--bg-elev))]" : "")
            }
            style={{ background: c }}
          />
        );
      })}
    </div>
  );
}

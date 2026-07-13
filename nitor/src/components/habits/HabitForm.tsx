"use client";
import { useState } from "react";
import type { Habit, HabitType } from "@/domain/types";
import { today } from "@/domain/dates";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";

const DEFAULT_COLOR = "#F5B841"; // palette's first amber

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]";

const TYPE_LABELS: Record<HabitType, string> = {
  boolean: "Yes / no",
  count: "Count",
  duration: "Duration",
  quantified: "Quantified",
  quit: "Quit",
};

export function HabitForm({ onSubmit }: { onSubmit: (habit: Habit) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [type, setType] = useState<HabitType>("boolean");
  const [target, setTarget] = useState(1);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        // Always build a fresh Habit with a new schedule object literal —
        // never mutate/share a nested object from elsewhere.
        const habit: Habit = {
          id: `h_${Date.now()}`,
          name: name.trim() || "New habit",
          emoji,
          color,
          category: "Personal",
          type,
          targetValue: type === "boolean" ? null : target,
          schedule: { kind: "daily" },
          strictness: "balanced",
          graceDaysPerWeek: 1,
          archived: false,
          createdAt: today(),
        };
        onSubmit(habit);
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none [background:rgb(var(--muted)/0.10)] placeholder:[color:rgb(var(--muted))]"
      />

      <div>
        <p className={`${eyebrow} mb-2`}>Emoji</p>
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Type</p>
        <div className="flex gap-2">
          {(["boolean", "count", "duration"] as HabitType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={
                "flex-1 rounded-2xl py-2 text-sm font-medium transition-colors " +
                (type === t
                  ? "text-white [background:rgb(var(--nitor))]"
                  : "[background:rgb(var(--muted)/0.10)] [color:rgb(var(--muted))]")
              }
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {type !== "boolean" && (
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none [background:rgb(var(--muted)/0.10)] [font-variant-numeric:tabular-nums] placeholder:[color:rgb(var(--muted))]"
          placeholder={type === "duration" ? "Target minutes" : "Target count"}
        />
      )}

      <button
        type="submit"
        className="w-full rounded-2xl py-3 text-sm font-medium text-white transition-transform duration-150 active:scale-[0.98] [background:rgb(var(--nitor))]"
      >
        Add habit
      </button>
    </form>
  );
}

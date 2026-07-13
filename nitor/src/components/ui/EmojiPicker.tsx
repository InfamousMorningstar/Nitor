"use client";
import { useMemo } from "react";
import { searchEmojis } from "@/domain/emojiData";

/**
 * Compact flat emoji grid. When `query` is provided (typically the habit
 * name field, live) the grid is filtered/ordered via `searchEmojis` so
 * matching emojis surface first as the user types. Selected emoji is
 * ringed in the accent color — no glow, no backgrounds beyond a flat
 * surface step.
 */
export function EmojiPicker({
  value,
  onChange,
  query = "",
}: {
  value: string;
  onChange: (e: string) => void;
  query?: string;
}) {
  const emojis = useMemo(() => searchEmojis(query), [query]);

  return (
    <div
      role="listbox"
      aria-label="Emoji"
      className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-10"
    >
      {emojis.map((e) => {
        const selected = value === e;
        return (
          <button
            key={e}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(e)}
            aria-label={`emoji ${e}`}
            className={
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
              (selected
                ? "ring-2 ring-[rgb(var(--accent))] [background:rgb(var(--surface-2))]"
                : "[background:rgb(var(--surface-2))] hover:[background:rgb(var(--surface-2))]/80")
            }
          >
            {e}
          </button>
        );
      })}
      {emojis.length === 0 && (
        <p className="col-span-full py-2 text-center text-xs [color:rgb(var(--text-mute))]">
          No matches
        </p>
      )}
    </div>
  );
}

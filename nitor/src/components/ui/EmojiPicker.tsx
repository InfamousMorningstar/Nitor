"use client";

const EMOJIS = ["📖", "🏋️", "💧", "🧘", "✍️", "🏃", "🥗", "😴", "🎯", "🎸", "🧹", "☎️", "💊", "🌱", "📵"];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOJIS.map((e) => {
        const selected = value === e;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            aria-pressed={selected}
            aria-label={`emoji ${e}`}
            className={
              "grid h-10 w-10 place-items-center rounded-xl text-lg transition-transform duration-150 active:scale-[0.97] " +
              (selected
                ? "ring-2 ring-[rgb(var(--nitor))] [background:rgb(var(--muted)/0.14)]"
                : "[background:rgb(var(--muted)/0.10)]")
            }
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}

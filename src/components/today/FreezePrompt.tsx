"use client";
import { useState } from "react";
import type { Habit, Log } from "@/domain/types";
import { computeStreak } from "@/domain/streaks";
import { weekdayOf } from "@/domain/dates";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DISMISS_KEY = "nitor.freezeDismissed";

function readDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]")); } catch { return new Set(); }
}
function dismiss(key: string) {
  const s = readDismissed(); s.add(key);
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...s]));
}

export function FreezePrompt({
  habit, logs, missedDate, onUse,
}: {
  habit: Habit; logs: Log[]; missedDate: string;
  onUse: () => void;
}) {
  const key = `${habit.id}:${missedDate}`;
  const [hidden, setHidden] = useState(() => readDismissed().has(key));
  if (hidden) return null;
  const streak = computeStreak(habit, logs, missedDate).current;
  const day = WEEKDAYS[weekdayOf(missedDate)];

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface))]">
      <span className="text-lg" aria-hidden>🛡</span>
      <p className="flex-1 text-sm [color:rgb(var(--text-dim))]">
        Protect your <strong className="[color:rgb(var(--text))]">{streak}-day {habit.name}</strong> streak? You missed {day}.
      </p>
      <button
        type="button"
        onClick={onUse}
        className="rounded-full px-4 py-2 text-sm font-medium [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] transition-transform duration-[var(--dur-micro)] active:scale-[0.98] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        Use a freeze
      </button>
      <button
        type="button"
        onClick={() => { dismiss(key); setHidden(true); }}
        className="text-sm [color:rgb(var(--text-mute))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        Let it reset
      </button>
    </div>
  );
}

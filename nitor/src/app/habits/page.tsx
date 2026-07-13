"use client";
import Link from "next/link";
import { useState } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { HabitForm } from "@/components/habits/HabitForm";
import { useHabits } from "@/state/useHabits";
import { useRepository } from "@/state/RepositoryProvider";
import type { Habit } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]";
const mono = "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";

export default function HabitsPage() {
  const { habits, refresh } = useHabits();
  const repo = useRepository();
  const [adding, setAdding] = useState(false);

  async function addHabit(h: Habit) {
    await repo.upsertHabit(h);
    setAdding(false);
    await refresh();
  }

  async function archive(id: string) {
    await repo.archiveHabit(id);
    await refresh();
  }

  return (
    <AppFrame>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Habits
        </h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-transform duration-150 active:scale-[0.97] [background:rgb(var(--nitor))]"
        >
          {adding ? "Close" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mb-8 max-w-xl rounded-[28px] border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-5">
          <HabitForm onSubmit={addHabit} />
        </div>
      )}

      {habits.length === 0 && !adding && (
        <p className="[color:rgb(var(--muted))]">
          No habits yet. Add one to start building momentum.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {habits.map((h) => (
          <li
            key={h.id}
            className="flex items-center gap-3 rounded-2xl border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-3"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl [background:rgb(var(--muted)/0.10)]"
              aria-hidden
            >
              {h.emoji}
            </span>
            <Link href={`/habits/${h.id}`} className="flex-1 truncate text-[15px] font-medium">
              {h.name}
            </Link>
            <span className={`${eyebrow} ${mono} normal-case`}>{h.type}</span>
            <button
              type="button"
              onClick={() => archive(h.id)}
              aria-label={`Archive ${h.name}`}
              className="rounded-full px-3 py-1.5 text-sm transition-colors [color:rgb(var(--muted))] hover:[color:rgb(var(--text))]"
            >
              Archive
            </button>
          </li>
        ))}
      </ul>
    </AppFrame>
  );
}

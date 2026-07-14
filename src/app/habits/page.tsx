"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { HabitDrawer } from "@/components/habits/HabitDrawer";
import { HabitForm, type HabitFormInitial } from "@/components/habits/HabitForm";
import { FlameIcon, scheduleLabel } from "@/components/today/HabitRow";
import { useHabits } from "@/state/useHabits";
import { useRepository } from "@/state/RepositoryProvider";
import { computeStreak } from "@/domain/streaks";
import { today } from "@/domain/dates";
import { HABIT_TEMPLATES, type HabitTemplate } from "@/domain/habitTemplates";
import type { Habit, HabitType } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";

const TYPE_TAG: Record<HabitType, string> = {
  boolean: "did it",
  count: "count",
  duration: "duration",
  quantified: "quantified",
  quit: "quit",
};

export default function HabitsPage() {
  const { habits, logs, refresh } = useHabits();
  const repo = useRepository();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<HabitFormInitial | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const now = today();

  const rows = useMemo(
    () =>
      habits
        .filter((h) => !h.archived)
        .map((h) => ({
          habit: h,
          streak: computeStreak(
            h,
            logs.filter((l) => l.habitId === h.id),
            now
          ),
        })),
    [habits, logs, now]
  );

  function openNewDrawer() {
    setDrawerInitial(undefined);
    setDrawerOpen(true);
  }

  function openFromTemplate(t: HabitTemplate) {
    setDrawerInitial({
      name: t.name,
      emoji: t.emoji,
      color: t.color,
      type: t.type,
      targetValue: t.targetValue,
      unit: t.unit,
      schedule: t.schedule,
    });
    setDrawerOpen(true);
  }

  async function addHabit(h: Habit) {
    await repo.upsertHabit(h);
    setDrawerOpen(false);
    await refresh();
  }

  async function archive(id: string) {
    await repo.archiveHabit(id);
    await refresh();
  }

  async function confirmDelete(habit: Habit) {
    const typed = confirmText.trim().toLowerCase();
    if (typed !== "delete" && typed !== habit.name.trim().toLowerCase()) return;
    await repo.deleteHabit(habit.id);
    setConfirmingId(null);
    setConfirmText("");
    await refresh();
  }

  return (
    <AppFrame>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className={eyebrow}>Building blocks</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
            Habits
          </h1>
        </div>
        <button
          type="button"
          onClick={openNewDrawer}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.97] [background:rgb(var(--accent))] [color:rgb(var(--bg))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          + New habit
        </button>
      </header>

      <section className="mb-10">
        <p className={`${eyebrow} mb-3`}>Start from a proven habit</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {HABIT_TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => openFromTemplate(t)}
              className="flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] hover:[border-color:rgb(var(--hairline)/0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              <span className="text-xl" aria-hidden="true">
                {t.emoji}
              </span>
              <span className="text-[13px] leading-snug [color:rgb(var(--text))]">{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="[color:rgb(var(--text-dim))]">
          No habits yet. Start from a template above or build your own.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ habit, streak }) => {
            const showFlame = streak.current >= 3;
            const confirming = confirmingId === habit.id;
            return (
              <li
                key={habit.id}
                className="flex items-center gap-3 overflow-hidden rounded-xl border pr-3 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
                style={{ borderLeft: `3px solid ${habit.color}` }}
              >
                <Link
                  href={`/habits/${habit.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg [background:rgb(var(--surface-2))]"
                    aria-hidden="true"
                  >
                    {habit.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] [color:rgb(var(--text))]">{habit.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`${mono} text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]`}>
                        {scheduleLabel(habit.schedule)} &middot; {TYPE_TAG[habit.type]}
                      </span>
                      <span className="flex items-center gap-1">
                        {showFlame && <FlameIcon />}
                        <span
                          className={`${mono} text-[11px] ${showFlame ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--text-mute))]"}`}
                        >
                          {streak.current}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>

                {confirming ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      autoFocus
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={`Type "${habit.name}" or "delete"`}
                      className="w-40 rounded-md border px-2 py-1 text-xs outline-none [border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] focus:[border-color:rgb(var(--accent))]"
                    />
                    <button
                      type="button"
                      onClick={() => confirmDelete(habit)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] [color:rgb(var(--accent))] hover:[color:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(null);
                        setConfirmText("");
                      }}
                      className="rounded-full px-3 py-1.5 text-xs [color:rgb(var(--text-mute))] hover:[color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => archive(habit.id)}
                      aria-label={`Archive ${habit.name}`}
                      className="rounded-full px-3 py-1.5 text-xs transition-colors duration-[var(--dur-micro)] [color:rgb(var(--text-mute))] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(habit.id);
                        setConfirmText("");
                      }}
                      aria-label={`Delete ${habit.name}`}
                      className="rounded-full px-3 py-1.5 text-xs transition-colors duration-[var(--dur-micro)] [color:rgb(var(--text-mute))] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <HabitDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New habit">
        <HabitForm onSubmit={addHabit} initial={drawerInitial} />
      </HabitDrawer>
    </AppFrame>
  );
}

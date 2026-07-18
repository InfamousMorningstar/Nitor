"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AppFrame } from "@/components/app/AppFrame";
import { QuoteCard } from "@/components/today/QuoteCard";
import { HabitRow } from "@/components/today/HabitRow";
import { useHabits } from "@/state/useHabits";
import { useSettingsStore } from "@/state/settingsStore";
import { freezeBank, rescuableMiss } from "@/domain/freezes";
import { FreezePrompt } from "@/components/today/FreezePrompt";
import { today } from "@/domain/dates";
import { isScheduledOn, isComplete } from "@/domain/streaks";

export default function TodayPage() {
  const { habits, logs, loading, error, log, refresh } = useHabits();
  const [doneOpen, setDoneOpen] = useState(false);
  const date = today();
  const streakFreezeEnabled = useSettingsStore((s) => s.streakFreeze);

  const scheduled = useMemo(
    () => habits.filter((h) => !h.archived && isScheduledOn(h, date)),
    [habits, date]
  );

  const withStatus = useMemo(
    () =>
      scheduled.map((h) => {
        const habitLogs = logs.filter((l) => l.habitId === h.id);
        const todayLog = habitLogs.find((l) => l.date === date);
        return { habit: h, habitLogs, done: isComplete(h, todayLog) };
      }),
    [scheduled, logs, date]
  );

  const incomplete = withStatus.filter((s) => !s.done);
  const completed = withStatus.filter((s) => s.done);
  const progress = scheduled.length === 0 ? 0 : Math.round((completed.length / scheduled.length) * 100);

  const freezePrompts = useMemo(() => {
    if (!streakFreezeEnabled) return [];
    return habits
      .filter((h) => !h.archived)
      .map((h) => {
        const habitLogs = logs.filter((l) => l.habitId === h.id);
        const missed = rescuableMiss(h, habitLogs, date);
        if (!missed || freezeBank(h, habitLogs, date) <= 0) return null;
        return { habit: h, habitLogs, missed };
      })
      .filter((p): p is { habit: (typeof habits)[number]; habitLogs: typeof logs; missed: string } => p !== null);
  }, [habits, logs, date, streakFreezeEnabled]);

  return (
    <AppFrame progress={progress}>
      <header className="mb-6">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
          {date}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Today
        </h1>
      </header>

      <div className="max-w-[720px]">
        <QuoteCard />

        {freezePrompts.map(({ habit, habitLogs, missed }) => (
          <FreezePrompt
            key={habit.id}
            habit={habit}
            logs={habitLogs}
            missedDate={missed}
            onUse={() => log({ habitId: habit.id, date: missed, value: false, isFreeze: true })}
          />
        ))}

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 [border-color:rgb(var(--accent)/0.3)] [background:rgb(var(--surface))]"
          >
            <p className="text-sm [color:rgb(var(--text))]">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-sm underline [color:rgb(var(--accent))] hover:[color:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="[color:rgb(var(--text-mute))]">Loading&hellip;</p>
        ) : scheduled.length === 0 ? (
          <div className="rounded-2xl border px-5 py-8 text-center [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]">
            <p className="[color:rgb(var(--text-dim))]">Nothing scheduled today. Rest is also a habit.</p>
            <Link
              href="/habits"
              className="mt-3 inline-block text-sm [color:rgb(var(--accent))] hover:[color:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              Add a habit &rarr;
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {incomplete.map(({ habit, habitLogs }) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                logs={habitLogs}
                onLog={(value) => log({ habitId: habit.id, date, value })}
              />
            ))}

            {incomplete.length === 0 && completed.length > 0 && (
              <p className="py-6 text-center text-sm [color:rgb(var(--text-dim))]">
                All done for today. Well kept.
              </p>
            )}

            {completed.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setDoneOpen((v) => !v)}
                  aria-expanded={doneOpen}
                  className={
                    "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.06em] [color:rgb(var(--text-mute))] " +
                    "transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                  }
                >
                  {doneOpen ? "▾" : "▸"} Done today ({completed.length})
                </button>

                {doneOpen && (
                  <div className="mt-2 flex flex-col gap-2">
                    {completed.map(({ habit, habitLogs }) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        logs={habitLogs}
                        onLog={(value) => log({ habitId: habit.id, date, value })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppFrame>
  );
}

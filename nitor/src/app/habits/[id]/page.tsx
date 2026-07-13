"use client";
import { use, useEffect, useState } from "react";
import { TabBar } from "@/components/nav/TabBar";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { useRepository } from "@/state/RepositoryProvider";
import { computeStreak } from "@/domain/streaks";
import { today } from "@/domain/dates";
import { auraFor } from "@/components/glass/aura";
import type { Habit, Log } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]";
const mono = "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HabitDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repo = useRepository();
  const [habit, setHabit] = useState<Habit | undefined>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [h, l] = await Promise.all([repo.getHabit(id), repo.listLogs(id)]);
      if (cancelled) return;
      setHabit(h);
      setLogs(l);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-4 pb-28 pt-12">
        <p className={`${eyebrow}`}>Loading…</p>
        <TabBar />
      </main>
    );
  }

  if (!habit) {
    return (
      <main className="mx-auto max-w-md px-4 pb-28 pt-12">
        <p className="[color:rgb(var(--muted))]">Habit not found.</p>
        <TabBar />
      </main>
    );
  }

  const now = today();
  const [y, m] = now.split("-").map(Number);
  const streak = computeStreak(habit, logs, now);
  const aura = auraFor(streak.momentum);

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-12">
      <header className="mb-8 flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl [background:rgb(var(--muted)/0.10)]"
          aria-hidden
        >
          {habit.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {habit.name}
          </h1>
          <p className={`${mono} mt-1 text-[13px] normal-case tracking-normal [color:rgb(var(--muted))]`}>
            streak <span className="[color:rgb(var(--text))]">{streak.current}</span>
            {" · "}best <span className="[color:rgb(var(--text))]">{streak.longest}</span>
            {" · "}momentum <span className="[color:rgb(var(--text))]">{streak.momentum}%</span>
          </p>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[28px] border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-5 sm:p-6">
        {/* Momentum Aura — same signature glow as the habit card, calm framing (no giant flame). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] [filter:blur(28px)]"
          style={{
            background: `radial-gradient(circle at 85% 0%, rgb(${aura.from}), rgb(${aura.to}) 45%, transparent 72%)`,
            opacity: aura.opacity,
          }}
        />
        <div className="relative">
          <p className={eyebrow}>
            {MONTH_LABELS[m - 1]} {y}
          </p>
          <div className="mt-4">
            <MonthCalendar habit={habit} logs={logs} year={y} monthIndex0={m - 1} />
          </div>
        </div>
      </section>

      <TabBar />
    </main>
  );
}

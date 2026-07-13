"use client";
import { TabBar } from "@/components/nav/TabBar";
import { HabitCard } from "@/components/today/HabitCard";
import { useHabits } from "@/state/useHabits";
import { today } from "@/domain/dates";

export default function TodayPage() {
  const { habits, logs, loading, log } = useHabits();

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-12">
      <header className="mb-6">
        <p className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--muted))]">
          {today()}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          Today
        </h1>
      </header>

      {loading ? (
        <p className="[color:rgb(var(--muted))]">Loading…</p>
      ) : (
        <div className="space-y-3">
          {habits.map((h, i) => (
            <div
              key={h.id}
              className="animate-[nitor-card-settle_480ms_ease-out_both]"
              style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              <HabitCard
                habit={h}
                logs={logs.filter((l) => l.habitId === h.id)}
                onLog={(value) => log({ habitId: h.id, date: today(), value })}
              />
            </div>
          ))}
        </div>
      )}

      <TabBar />
    </main>
  );
}

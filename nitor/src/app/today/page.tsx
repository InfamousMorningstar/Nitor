"use client";
import { AppFrame } from "@/components/app/AppFrame";
import { HabitCard } from "@/components/today/HabitCard";
import { useHabits } from "@/state/useHabits";
import { today } from "@/domain/dates";

export default function TodayPage() {
  const { habits, logs, loading, log } = useHabits();

  return (
    <AppFrame>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </AppFrame>
  );
}

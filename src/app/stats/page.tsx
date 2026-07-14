"use client";
import { useMemo, useState } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { YearHeatmap } from "@/components/stats/YearHeatmap";
import { MomentumLine } from "@/components/stats/MomentumLine";
import { WeekdayBars } from "@/components/stats/WeekdayBars";
import { Sparkline } from "@/components/stats/Sparkline";
import { useHabits } from "@/state/useHabits";
import { computeStreak } from "@/domain/streaks";
import { dailyCompletion, momentumSeries, weekdayRhythm, habitSparkline } from "@/domain/stats";
import { addDays, diffDays, today } from "@/domain/dates";
import type { Habit } from "@/domain/types";

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const card = "rounded-2xl border p-5 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]";
const SPARKLINE_DAYS = 90;

type RangeKey = "30d" | "90d" | "1y" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
];

function rangeFrom(range: RangeKey, habits: Habit[]): string {
  const end = today();
  if (range === "30d") return addDays(end, -29);
  if (range === "90d") return addDays(end, -89);
  if (range === "1y") return addDays(end, -370); // ~53 weeks, GitHub-style
  const starts = habits.filter((h) => !h.archived).map((h) => h.startDate ?? h.createdAt);
  if (starts.length === 0) return addDays(end, -89);
  return starts.reduce((min, d) => (diffDays(d, min) < 0 ? d : min), starts[0]);
}

export default function StatsPage() {
  const { habits, logs, loading } = useHabits();
  const [range, setRange] = useState<RangeKey>("1y");
  const [habitFilter, setHabitFilter] = useState<string>("all");

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const end = today();
  const from = useMemo(() => rangeFrom(range, habits), [range, habits]);
  const rangeDays = Math.max(1, diffDays(end, from) + 1);

  const heatmapHabits = useMemo(
    () => (habitFilter === "all" ? activeHabits : activeHabits.filter((h) => h.id === habitFilter)),
    [activeHabits, habitFilter]
  );

  const heatmapData = useMemo(
    () => dailyCompletion(heatmapHabits, logs, from, end),
    [heatmapHabits, logs, from, end]
  );

  const momentum = useMemo(
    () => momentumSeries(activeHabits, logs, rangeDays),
    [activeHabits, logs, rangeDays]
  );

  const weekday = useMemo(
    () => weekdayRhythm(activeHabits, logs, from, end),
    [activeHabits, logs, from, end]
  );

  const sparkrows = useMemo(
    () =>
      activeHabits.map((h) => {
        const habitLogs = logs.filter((l) => l.habitId === h.id);
        const streak = computeStreak(h, habitLogs, end);
        const daily = dailyCompletion([h], logs, from, end);
        const totals = daily.reduce(
          (acc, d) => ({ done: acc.done + d.done, scheduled: acc.scheduled + d.scheduled }),
          { done: 0, scheduled: 0 }
        );
        const pct = totals.scheduled === 0 ? 0 : Math.round((100 * totals.done) / totals.scheduled);
        const sparkline = habitSparkline(h, logs, SPARKLINE_DAYS);
        return { habit: h, streak, pct, sparkline };
      }),
    [activeHabits, logs, from, end]
  );

  return (
    <AppFrame>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Analytics</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight [color:rgb(var(--text))]">
            Stats
          </h1>
        </div>

        <div
          role="group"
          aria-label="Date range"
          className="flex items-center gap-1 rounded-full border p-1 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={`${mono} rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.06em] transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ${
                range === r.key
                  ? "[background:rgb(var(--accent))] [color:rgb(var(--bg))]"
                  : "[color:rgb(var(--text-mute))] hover:[color:rgb(var(--text-dim))]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="[color:rgb(var(--text-mute))]">Loading&hellip;</p>
      ) : (
        <div className="max-w-[1000px] space-y-6">
          <section className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium [color:rgb(var(--text))]">Completion heatmap</h2>
              <label className="flex items-center gap-2">
                <span className={`${eyebrow} sr-only`}>Filter habit</span>
                <select
                  value={habitFilter}
                  onChange={(e) => setHabitFilter(e.target.value)}
                  className={`${mono} rounded-full border px-3 py-1.5 text-xs outline-none [border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]`}
                >
                  <option value="all">All habits</option>
                  {activeHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.emoji} {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <YearHeatmap data={heatmapData} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className={card}>
              <h2 className="mb-4 text-sm font-medium [color:rgb(var(--text))]">Momentum</h2>
              <MomentumLine data={momentum} />
            </section>
            <section className={card}>
              <h2 className="mb-4 text-sm font-medium [color:rgb(var(--text))]">Weekday rhythm</h2>
              <WeekdayBars data={weekday} />
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-medium [color:rgb(var(--text))]">Per habit</h2>
            {sparkrows.length === 0 ? (
              <p className="[color:rgb(var(--text-dim))]">No habits yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sparkrows.map(({ habit, streak, pct, sparkline }) => (
                  <li
                    key={habit.id}
                    className="flex items-center gap-3 overflow-hidden rounded-xl border pl-3 pr-4 py-3 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
                    style={{ borderLeft: `3px solid ${habit.color}` }}
                  >
                    <span className="shrink-0 text-lg" aria-hidden="true">
                      {habit.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] [color:rgb(var(--text))]">
                      {habit.name}
                    </span>

                    <span
                      className={`${mono} shrink-0 text-right text-[11px] [color:rgb(var(--text-mute))]`}
                      title="Current / best streak"
                    >
                      <span className="[color:rgb(var(--accent))]">{streak.current}</span>
                      <span> / {streak.longest}</span>
                    </span>

                    <Sparkline values={sparkline} className="shrink-0" />

                    <span className={`${mono} w-12 shrink-0 text-right text-[13px] [color:rgb(var(--text))]`}>
                      {pct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppFrame>
  );
}

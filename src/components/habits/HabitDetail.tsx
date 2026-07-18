"use client";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Habit, Log } from "@/domain/types";
import type { LogInput } from "@/data/repository";
import { HabitForm, type HabitFormInitial } from "@/components/habits/HabitForm";
import { MiniHeatmap } from "@/components/stats/MiniHeatmap";
import { computeStreak, isComplete } from "@/domain/streaks";
import { freezeBank, BANK_CAP } from "@/domain/freezes";
import { editableDays, BACKDATE_DAYS } from "@/domain/backdate";
import { today, weekdayOf } from "@/domain/dates";

type Tab = "overview" | "edit" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "edit", label: "Edit" },
  { id: "history", label: "History" },
];

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const fieldInput =
  "rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] focus:[border-color:rgb(var(--accent))]";

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface HabitDetailProps {
  /** The habit this drawer/panel is showing. */
  habit: Habit;
  /** Logs for this habit only (already filtered by the caller, matching HabitRow's contract). */
  logs: Log[];
  /** Called with a full LogInput when a History-tab control is used (checkbox toggle or number entry). */
  onLog: (input: LogInput) => void;
  /** Called with the merged, ready-to-persist Habit when the Edit tab is submitted. Caller is expected to route this through repo.upsertHabit + refresh, same as the Habits page's create flow. */
  onSaved: (habit: Habit) => void;
}

/**
 * Tabbed detail panel that renders as the `HabitDrawer`'s children: a
 * read-only Overview (heatmap, streaks, freeze bank), an Edit tab that
 * reuses the existing HabitForm, and a History tab for backdating recent
 * scheduled days.
 */
export function HabitDetail({ habit, logs, onLog, onSaved }: HabitDetailProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    overview: null,
    edit: null,
    history: null,
  });
  const now = today();

  const streak = useMemo(() => computeStreak(habit, logs, now), [habit, logs, now]);
  const bank = useMemo(() => freezeBank(habit, logs, now), [habit, logs, now]);
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const editInitial: HabitFormInitial = useMemo(
    () => ({
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      type: habit.type,
      targetValue: habit.targetValue ?? undefined,
      unit: habit.unit,
      schedule: habit.schedule,
      category: habit.category,
      strictness: habit.strictness,
      graceDaysPerWeek: habit.graceDaysPerWeek,
    }),
    [habit]
  );

  // HabitForm always builds a brand-new Habit (fresh id, createdAt, and the
  // fields it has no UI for). Re-attach the original identity + remaining
  // non-editable fields so "Edit" behaves like an update, not a duplicate.
  function handleEditSubmit(draft: Habit) {
    onSaved({
      ...draft,
      id: habit.id,
      createdAt: habit.createdAt,
      archived: habit.archived,
      startDate: habit.startDate,
      order: habit.order,
    });
  }

  const needsNumber = habit.type === "count" || habit.type === "duration" || habit.type === "quantified";
  const target = habit.targetValue ?? 1;

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: Tab) {
    const currentIndex = TABS.findIndex(({ id }) => id === currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(TABS[nextIndex].id);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Habit detail"
        className="mb-6 flex gap-4 border-b [border-color:rgb(var(--hairline)/0.08)]"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[id] = node;
            }}
            type="button"
            role="tab"
            id={`habit-detail-tab-${id}`}
            aria-controls={`habit-detail-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, id)}
            className={
              `${eyebrow} border-b-2 px-1 pb-3 transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ` +
              (tab === id
                ? "border-[rgb(var(--accent))] [color:rgb(var(--accent))]"
                : "border-transparent hover:[color:rgb(var(--text-dim))]")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div
          id="habit-detail-panel-overview"
          role="tabpanel"
          aria-labelledby="habit-detail-tab-overview"
          tabIndex={0}
          className="space-y-6"
        >
          <div>
            <p className={`${eyebrow} mb-2`}>Last 13 weeks</p>
            <MiniHeatmap habit={habit} logs={logs} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Current" value={streak.current} />
            <StatCard label="Longest" value={streak.longest} />
            <StatCard label="Momentum" value={`${streak.momentum}%`} />
          </div>

          <div>
            <p className={`${eyebrow} mb-2`}>Freeze bank</p>
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`${bank} of ${BANK_CAP} streak freezes banked`}
            >
              {Array.from({ length: BANK_CAP }, (_, i) => (
                <span key={i} aria-hidden="true" className={`text-lg ${i < bank ? "" : "opacity-20"}`}>
                  🛡
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "edit" && (
        <div
          id="habit-detail-panel-edit"
          role="tabpanel"
          aria-labelledby="habit-detail-tab-edit"
          tabIndex={0}
        >
          <HabitForm initial={editInitial} submitLabel="Save changes" onSubmit={handleEditSubmit} />
        </div>
      )}

      {tab === "history" && (
        <div
          id="habit-detail-panel-history"
          role="tabpanel"
          aria-labelledby="habit-detail-tab-history"
          tabIndex={0}
        >
          <p className={`${eyebrow} mb-3`}>Last {BACKDATE_DAYS} days</p>
          <ul className="flex flex-col gap-2">
            {editableDays(habit, now).map(({ date, scheduled }) => {
              const weekday = WEEKDAY_ABBR[weekdayOf(date)];

              if (!scheduled) {
                return (
                  <li
                    key={date}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 [border-color:rgb(var(--hairline)/0.08)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`${mono} text-sm [color:rgb(var(--text-mute))]`}>{date}</span>
                      <span className={`${mono} text-xs [color:rgb(var(--text-mute))]`}>{weekday}</span>
                    </span>
                    <span className="text-xs italic [color:rgb(var(--text-mute))]">Not scheduled</span>
                  </li>
                );
              }

              const log = byDate.get(date);
              const done = isComplete(habit, log);
              const protectedDay = Boolean(log?.isGraceDay || log?.isFreeze);
              const statusLabel = done ? "Done" : protectedDay ? "Protected" : date === now ? "Open" : "Missed";
              const numericValue = typeof log?.value === "number" ? log.value : 0;

              return (
                <li
                  key={date}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))]"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className={`${mono} text-sm [color:rgb(var(--text))]`}>{date}</span>
                      <span className={`${mono} text-xs [color:rgb(var(--text-mute))]`}>{weekday}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs [color:rgb(var(--text-mute))]">
                      {protectedDay && (
                        <span aria-hidden="true" title="Protected by grace day / streak freeze">
                          🛡
                        </span>
                      )}
                      {statusLabel}
                    </span>
                  </div>

                  {habit.type === "boolean" || habit.type === "quit" ? (
                    <input
                      type="checkbox"
                      aria-label={`Mark ${habit.name} ${done ? "not done" : "done"} on ${date}`}
                      checked={done}
                      onChange={(e) => onLog({ habitId: habit.id, date, value: e.target.checked })}
                      className="h-5 w-5 shrink-0 accent-[rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                    />
                  ) : needsNumber ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        aria-label={`${habit.name} value on ${date}`}
                        value={numericValue}
                        onChange={(e) =>
                          onLog({ habitId: habit.id, date, value: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className={`${fieldInput} ${mono} w-16 text-right`}
                      />
                      <span className={`${mono} text-xs [color:rgb(var(--text-mute))]`}>
                        /{target}
                        {habit.type === "quantified" && habit.unit ? ` ${habit.unit}` : ""}
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border px-3 py-2 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface-2))]">
      <p className={eyebrow}>{label}</p>
      <p className={`${mono} text-lg [color:rgb(var(--text))]`}>{value}</p>
    </div>
  );
}

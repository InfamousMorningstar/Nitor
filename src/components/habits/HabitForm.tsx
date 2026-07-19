"use client";
import { useState } from "react";
import type { Habit, HabitType, Schedule, ScheduleKind, Strictness } from "@/domain/types";
import { today } from "@/domain/dates";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";

const DEFAULT_COLOR = "#F5B841"; // palette's first amber

const eyebrow =
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]";
const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const fieldInput =
  "w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))] focus:[border-color:rgb(var(--accent))]";

const TYPE_OPTIONS: { type: HabitType; label: string; hint: string }[] = [
  { type: "boolean", label: "Boolean", hint: "Did it" },
  { type: "count", label: "Count", hint: "n times" },
  { type: "duration", label: "Duration", hint: "n minutes" },
  { type: "quantified", label: "Quantified", hint: "number + unit" },
  { type: "quit", label: "Quit", hint: "days without" },
];

const SCHEDULE_OPTIONS: { kind: ScheduleKind; label: string }[] = [
  { kind: "daily", label: "Daily" },
  { kind: "weekdays", label: "Weekdays" },
  { kind: "timesPerWeek", label: "N×/week" },
  { kind: "everyNDays", label: "Every N days" },
  { kind: "monthly", label: "Monthly" },
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const STRICTNESS_OPTIONS: { value: Strictness; label: string }[] = [
  { value: "strict", label: "Strict" },
  { value: "balanced", label: "Balanced" },
  { value: "flexible", label: "Flexible" },
];

export interface HabitFormInitial {
  name?: string;
  emoji?: string;
  color?: string;
  type?: HabitType;
  targetValue?: number;
  unit?: string;
  schedule?: Schedule;
  category?: string;
  strictness?: Strictness;
  graceDaysPerWeek?: number;
}

function normalizeGraceDays(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(7, Math.max(0, Math.trunc(value)));
}

function newHabitId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `h_${Date.now()}_${rand}`;
}

export function HabitForm({
  onSubmit,
  initial,
  submitLabel = "Add habit",
}: {
  onSubmit: (habit: Habit) => void;
  initial?: HabitFormInitial;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🎯");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [type, setType] = useState<HabitType>(initial?.type ?? "boolean");
  const [target, setTarget] = useState(initial?.targetValue ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Personal");
  const [strictness, setStrictness] = useState<Strictness>(initial?.strictness ?? "balanced");
  const [graceDaysPerWeek, setGraceDaysPerWeek] = useState(
    normalizeGraceDays(initial?.graceDaysPerWeek ?? 1),
  );

  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>(initial?.schedule?.kind ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.schedule?.weekdays ?? [1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(initial?.schedule?.timesPerWeek ?? 3);
  const [everyNDays, setEveryNDays] = useState(initial?.schedule?.everyNDays ?? 2);
  const [monthlyDay, setMonthlyDay] = useState(initial?.schedule?.monthlyDay ?? 1);

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  function buildSchedule(): Schedule {
    switch (scheduleKind) {
      case "weekdays":
        return { kind: "weekdays", weekdays: [...weekdays] };
      case "timesPerWeek":
        return { kind: "timesPerWeek", timesPerWeek };
      case "everyNDays":
        return { kind: "everyNDays", everyNDays };
      case "monthly":
        return { kind: "monthly", monthlyDay };
      case "daily":
      default:
        return { kind: "daily" };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const needsTarget = type === "count" || type === "duration" || type === "quantified";
    // Always build a fresh Habit with a brand-new, freshly-constructed
    // schedule object — never mutate or share a nested object from a
    // template or elsewhere.
    const habit: Habit = {
      id: newHabitId(),
      name: name.trim() || "New habit",
      emoji,
      color,
      category: category.trim() || "Personal",
      type,
      targetValue: needsTarget ? target : null,
      schedule: buildSchedule(),
      strictness,
      graceDaysPerWeek: normalizeGraceDays(graceDaysPerWeek),
      archived: false,
      createdAt: today(),
      ...(type === "quantified" && unit.trim() ? { unit: unit.trim() } : {}),
    };
    onSubmit(habit);
  }

  const needsTarget = type === "count" || type === "duration" || type === "quantified";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="habit-name" className={`${eyebrow} mb-2 block`}>
          Name
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read before bed"
          className={fieldInput}
        />
      </div>

      <div>
        <label htmlFor="habit-category" className={`${eyebrow} mb-2 block`}>
          Category
        </label>
        <input
          id="habit-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Growth"
          className={fieldInput}
        />
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Emoji</p>
        <EmojiPicker value={emoji} onChange={setEmoji} query={name} />
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Edge color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map(({ type: t, label, hint }) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={
                "rounded-lg border px-3 py-2 text-left transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
                (type === t
                  ? "border-[rgb(var(--accent))] [background:rgb(var(--surface-2))]"
                  : "[border-color:rgb(var(--hairline)/0.12)] hover:[border-color:rgb(var(--hairline)/0.24)]")
              }
            >
              <span className={"block text-sm font-medium " + (type === t ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--text))]")}>
                {label}
              </span>
              <span className="block text-xs [color:rgb(var(--text-mute))]">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {needsTarget && (
        <div className={type === "quantified" ? "grid grid-cols-2 gap-3" : ""}>
          <div>
            <label htmlFor="habit-target" className={`${eyebrow} mb-2 block`}>
              {type === "duration" ? "Target minutes" : "Target"}
            </label>
            <input
              id="habit-target"
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))}
              className={`${fieldInput} ${mono}`}
            />
          </div>
          {type === "quantified" && (
            <div>
              <label htmlFor="habit-unit" className={`${eyebrow} mb-2 block`}>
                Unit
              </label>
              <input
                id="habit-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pages"
                className={fieldInput}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <div>
          <p className={`${eyebrow} mb-2`}>Strictness</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Strictness">
            {STRICTNESS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={strictness === value}
                onClick={() => setStrictness(value)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
                  (strictness === value
                    ? "border-[rgb(var(--accent))] [color:rgb(var(--accent))]"
                    : "[border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--hairline)/0.24)]")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="habit-grace-days-per-week" className={`${eyebrow} mb-2 block`}>
            Grace days per week
          </label>
          <input
            id="habit-grace-days-per-week"
            type="number"
            min={0}
            max={7}
            step={1}
            value={graceDaysPerWeek}
            onChange={(e) => setGraceDaysPerWeek(normalizeGraceDays(Number(e.target.value)))}
            className={`${fieldInput} ${mono}`}
          />
        </div>
      </div>

      <div>
        <p className={`${eyebrow} mb-2`}>Schedule</p>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={scheduleKind === kind}
              onClick={() => setScheduleKind(kind)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
                (scheduleKind === kind
                  ? "border-[rgb(var(--accent))] [color:rgb(var(--accent))]"
                  : "[border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--hairline)/0.24)]")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {scheduleKind === "weekdays" && (
          <div className="mt-3 flex gap-1.5">
            {WEEKDAY_LABELS.map((label, d) => {
              const on = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]}
                  aria-pressed={on}
                  onClick={() => toggleWeekday(d)}
                  className={
                    `${mono} grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] ` +
                    (on
                      ? "border-transparent [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))]"
                      : "[border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))]")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {scheduleKind === "timesPerWeek" && (
          <div className="mt-3 max-w-[10rem]">
            <label htmlFor="habit-times-per-week" className={`${eyebrow} mb-2 block`}>
              Times per week
            </label>
            <input
              id="habit-times-per-week"
              type="number"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
              className={`${fieldInput} ${mono}`}
            />
          </div>
        )}

        {scheduleKind === "everyNDays" && (
          <div className="mt-3 max-w-[10rem]">
            <label htmlFor="habit-every-n-days" className={`${eyebrow} mb-2 block`}>
              Every N days
            </label>
            <input
              id="habit-every-n-days"
              type="number"
              min={2}
              value={everyNDays}
              onChange={(e) => setEveryNDays(Math.max(2, Number(e.target.value) || 2))}
              className={`${fieldInput} ${mono}`}
            />
          </div>
        )}

        {scheduleKind === "monthly" && (
          <div className="mt-3 max-w-[10rem]">
            <label htmlFor="habit-monthly-day" className={`${eyebrow} mb-2 block`}>
              Day of month
            </label>
            <input
              id="habit-monthly-day"
              type="number"
              min={1}
              max={31}
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              className={`${fieldInput} ${mono}`}
            />
          </div>
        )}
      </div>

      {/*
        Primary action — MUST look correct in both light and dark themes.
        Uses the theme-aware --accent/--bg tokens (never a hardcoded
        color), so the button re-tints automatically when the theme
        toggles instead of going illegible in one mode.
      */}
      <button
        type="submit"
        className="w-full rounded-lg py-3 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.99] [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        {submitLabel}
      </button>
    </form>
  );
}

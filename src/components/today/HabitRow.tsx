"use client";
import { useEffect, useRef, useState } from "react";
import type { Habit, Log, Schedule } from "@/domain/types";
import { computeStreak, isComplete } from "@/domain/streaks";
import { useToday, useStreakOptions } from "@/state/useDateSettings";
import { usePetStore } from "@/state/petStore";

const mono = "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]";
const CELEBRATE_MS = 380; // stays under the 400ms motion ceiling

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Short mono schedule tag, e.g. "Daily", "Mon–Fri", "3×/week". */
export function scheduleLabel(schedule: Schedule): string {
  if (schedule.kind === "daily") return "Daily";
  if (schedule.kind === "timesPerWeek") return `${schedule.timesPerWeek ?? 1}×/week`;
  const days = schedule.weekdays ?? [];
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Mon–Fri";
  if (days.length === 7) return "Daily";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Sat–Sun";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_ABBR[d])
    .join(", ");
}

export function FlameIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 [fill:rgb(var(--accent))]"
    >
      <path d="M12 2c.6 2.4-.6 3.7-2 5.2C8.4 8.9 7 10.6 7 13a5 5 0 0 0 10 0c0-1.7-.7-2.8-1.5-3.9-.2 1.4-.9 2.2-1.7 2.2-1 0-1.3-.9-1-2 .5-1.9-.2-4.6-2.8-7.3Zm0 17a4 4 0 0 1-4-4c0-1.2.5-2 1.2-2.9.2 1 .9 1.9 2 1.9.9 0 1.5-.6 1.4-1.5-.1-.8.2-1.5.8-2 .9.9 1.6 2 1.6 3.5a4 4 0 0 1-3 4Z" />
    </svg>
  );
}

interface HabitRowProps {
  habit: Habit;
  logs: Log[];
  onLog: (value: number | boolean) => void;
}

export function HabitRow({ habit, logs, onLog }: HabitRowProps) {
  const feed = usePetStore((s) => s.feed);
  const streakOptions = useStreakOptions();
  const [celebrating, setCelebrating] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
  }, []);

  const date = useToday();
  const streak = computeStreak(habit, logs, date, streakOptions);
  const todayLog = logs.find((l) => l.date === date);
  const done = isComplete(habit, todayLog);
  const count = typeof todayLog?.value === "number" ? todayLog.value : 0;
  const target = habit.targetValue ?? 1;
  const showFlame = streak.current >= 3;

  const celebrate = () => {
    feed();
    setCelebrating(true);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
  };

  return (
    <div
      className={
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-[filter] duration-[380ms] [transition-timing-function:var(--ease)] [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] " +
        (celebrating ? "saturate-[0.35]" : "")
      }
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg [background:rgb(var(--surface-2))]"
        aria-hidden="true"
      >
        {habit.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-[family-name:var(--font-geist-sans)] [color:rgb(var(--text))]">
          {habit.name}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`${mono} text-[11px] uppercase tracking-[0.06em] [color:rgb(var(--text-mute))]`}>
            {scheduleLabel(habit.schedule)}
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

      {habit.type === "boolean" && (
        <button
          type="button"
          aria-label={`Mark ${habit.name} ${done ? "not done" : "done"}`}
          aria-pressed={done}
          onClick={() => {
            const next = !done;
            onLog(next);
            if (next) celebrate();
          }}
          className={
            "grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
            (done
              ? "border-transparent [background:rgb(var(--accent))] text-black"
              : "[border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-mute))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))]")
          }
        >
          {done ? "✓" : ""}
        </button>
      )}

      {habit.type === "count" && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${habit.name}`}
            onClick={() => onLog(Math.max(0, count - 1))}
            className="grid h-9 w-9 place-items-center rounded-full border text-base transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            −
          </button>
          <span className={`${mono} w-14 text-center text-sm [color:rgb(var(--text))]`}>
            {count}/{target}
          </span>
          <button
            type="button"
            aria-label={`Increase ${habit.name}`}
            onClick={() => {
              const next = count + 1;
              onLog(next);
              if (next >= target && count < target) celebrate();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border text-base transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            +
          </button>
        </div>
      )}

      {habit.type === "duration" && (
        <DurationControl
          habit={habit}
          done={done}
          initialValue={typeof todayLog?.value === "number" ? todayLog.value : 0}
          onLog={onLog}
          onComplete={celebrate}
        />
      )}

      {habit.type === "quantified" && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${habit.name}`}
            onClick={() => onLog(Math.max(0, count - 1))}
            className="grid h-9 w-9 place-items-center rounded-full border text-base transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            −
          </button>
          <span className={`${mono} min-w-[4.5rem] text-center text-sm [color:rgb(var(--text))]`}>
            {count}/{target}
            {habit.unit ? ` ${habit.unit}` : ""}
          </span>
          <button
            type="button"
            aria-label={`Increase ${habit.name}`}
            onClick={() => {
              const next = count + 1;
              onLog(next);
              if (next >= target && count < target) celebrate();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border text-base transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            +
          </button>
        </div>
      )}

      {habit.type === "quit" && (
        <button
          type="button"
          aria-label={`Mark ${habit.name} ${done ? "not clean today" : "clean today"}`}
          aria-pressed={done}
          onClick={() => {
            const next = !done;
            onLog(next);
            if (next) celebrate();
          }}
          className={
            "grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
            (done
              ? "border-transparent [background:rgb(var(--accent))] text-black"
              : "[border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-mute))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))]")
          }
        >
          {done ? "✓" : ""}
        </button>
      )}
    </div>
  );
}

function DurationControl({
  habit,
  done,
  initialValue,
  onLog,
  onComplete,
}: {
  habit: Habit;
  done: boolean;
  initialValue: number;
  onLog: (value: number) => void;
  onComplete: () => void;
}) {
  const target = habit.targetValue ?? 1;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(initialValue * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const minutes = Math.floor(seconds / 60);

  const handleDone = () => {
    setRunning(false);
    onLog(target);
    if (!done) onComplete();
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={running ? `Pause ${habit.name} timer` : `Start ${habit.name} timer`}
        onClick={() => setRunning((r) => !r)}
        className="grid h-9 w-9 place-items-center rounded-full border text-sm transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        {running ? "❚❚" : "▶"}
      </button>
      <span className={`${mono} w-14 text-center text-sm [color:rgb(var(--text))]`}>
        {minutes}/{target}m
      </span>
      <button
        type="button"
        aria-label={`Mark ${habit.name} done`}
        onClick={handleDone}
        className={
          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] " +
          (done
            ? "border-transparent [background:rgb(var(--accent))] text-black"
            : "[border-color:rgb(var(--hairline)/0.16)] [color:rgb(var(--text-mute))] hover:[border-color:rgb(var(--accent)/0.5)] hover:[color:rgb(var(--accent))]")
        }
      >
        {done ? "Done" : "Mark done"}
      </button>
    </div>
  );
}

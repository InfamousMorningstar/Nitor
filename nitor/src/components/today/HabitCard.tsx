"use client";
import type { Habit, Log } from "@/domain/types";
import { computeStreak, isComplete } from "@/domain/streaks";
import { today } from "@/domain/dates";
import { auraFor } from "@/components/glass/aura";
import { MomentumBar } from "./MomentumBar";

const eyebrow =
  "font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em] [color:rgb(var(--muted))]";
const mono = "font-[family-name:var(--font-geist-mono)] [font-variant-numeric:tabular-nums]";

export function HabitCard({
  habit,
  logs,
  onLog,
}: {
  habit: Habit;
  logs: Log[];
  onLog: (value: number | boolean) => void;
}) {
  const streak = computeStreak(habit, logs, today());
  const todayLog = logs.find((l) => l.date === today());
  const done = isComplete(habit, todayLog);
  const count = typeof todayLog?.value === "number" ? todayLog.value : 0;
  const aura = auraFor(streak.momentum);

  return (
    <div className="relative overflow-hidden rounded-[28px] border [border-color:rgb(var(--hairline)/0.10)] [background:rgb(var(--bg-elev))] p-4 sm:p-5">
      {/*
        Momentum Aura — the signature glow. A soft radial light living inside
        the card's own clip, warmth/brightness driven by this habit's
        momentum (auraFor): cool + dim when resting, warm + bright when
        radiant. Purely decorative, kept behind the content layer.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] [filter:blur(28px)]"
        style={{
          background: `radial-gradient(circle at 15% 45%, rgb(${aura.from}), rgb(${aura.to}) 45%, transparent 72%)`,
          opacity: aura.opacity,
        }}
      />

      <div className="relative flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl [background:rgb(var(--muted)/0.10)]"
          aria-hidden
        >
          {habit.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{habit.name}</div>
          <div className="mt-0.5 flex items-center gap-3">
            <span className={eyebrow}>
              streak{" "}
              <span className={`${mono} normal-case text-[13px] [color:rgb(var(--text))]`}>
                {streak.current}
              </span>
            </span>
            <span className={eyebrow}>
              best{" "}
              <span className={`${mono} normal-case text-[13px] [color:rgb(var(--text))]`}>
                {streak.longest}
              </span>
            </span>
          </div>
        </div>

        {habit.type === "boolean" && (
          <button
            type="button"
            aria-label={`Mark ${habit.name} ${done ? "not done" : "done"}`}
            onClick={() => onLog(!done)}
            className={
              "grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg transition-transform duration-150 active:scale-[0.97] " +
              (done ? "text-white" : "[color:rgb(var(--muted))] [background:rgb(var(--muted)/0.12)]")
            }
            style={done ? { background: habit.color } : undefined}
          >
            ✓
          </button>
        )}

        {habit.type === "count" && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={`Decrease ${habit.name}`}
              onClick={() => onLog(Math.max(0, count - 1))}
              className="grid h-11 w-11 place-items-center rounded-full text-lg transition-transform duration-150 active:scale-[0.97] [background:rgb(var(--muted)/0.12)]"
            >
              −
            </button>
            <span className={`${mono} w-12 text-center text-sm`}>
              {count}/{habit.targetValue}
            </span>
            <button
              type="button"
              aria-label={`Increase ${habit.name}`}
              onClick={() => onLog(count + 1)}
              className="grid h-11 w-11 place-items-center rounded-full text-lg text-white transition-transform duration-150 active:scale-[0.97]"
              style={{ background: habit.color }}
            >
              +
            </button>
          </div>
        )}

        {habit.type === "duration" && (
          <button
            type="button"
            aria-label={`Mark ${habit.name} done`}
            onClick={() => onLog(habit.targetValue ?? 1)}
            className={
              "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-transform duration-150 active:scale-[0.97] " +
              (done ? "text-white" : "[color:rgb(var(--muted))] [background:rgb(var(--muted)/0.12)]")
            }
            style={done ? { background: habit.color } : undefined}
          >
            {done ? "Done" : <span className={mono}>{habit.targetValue}m</span>}
          </button>
        )}
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <MomentumBar value={streak.momentum} color={habit.color} />
        <span className={`${mono} shrink-0 text-xs [color:rgb(var(--muted))]`}>
          {streak.momentum}%
        </span>
      </div>
    </div>
  );
}

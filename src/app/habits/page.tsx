"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app/AppFrame";
import { HabitDrawer } from "@/components/habits/HabitDrawer";
import { HabitForm, type HabitFormInitial } from "@/components/habits/HabitForm";
import { HabitDetail } from "@/components/habits/HabitDetail";
import { ConfirmDeleteDialog } from "@/components/habits/ConfirmDeleteDialog";
import { FlameIcon, scheduleLabel } from "@/components/today/HabitRow";
import { useHabits } from "@/state/useHabits";
import { useRepository } from "@/state/RepositoryProvider";
import { computeStreak } from "@/domain/streaks";
import { useToday, useStreakOptions } from "@/state/useDateSettings";
import { sortHabits, assignInitialOrder, reorder } from "@/domain/habitOrder";
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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function HabitsPage() {
  const { habits, logs, loading, log, refresh } = useHabits();
  const repo = useRepository();
  const reducedMotion = usePrefersReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<HabitFormInitial | undefined>(undefined);
  const [detailHabitId, setDetailHabitId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const now = useToday();
  const streakOptions = useStreakOptions();

  const sortedHabits = useMemo(() => sortHabits(habits), [habits]);

  const rows = useMemo(
    () =>
      sortedHabits
        .filter((h) => !h.archived)
        .map((h) => ({
          habit: h,
          streak: computeStreak(
            h,
            logs.filter((l) => l.habitId === h.id),
            now,
            streakOptions
          ),
        })),
    [sortedHabits, logs, now, streakOptions]
  );

  const detailHabit = useMemo(
    () => (detailHabitId ? habits.find((h) => h.id === detailHabitId) : undefined),
    [habits, detailHabitId]
  );
  const detailLogs = useMemo(
    () => (detailHabit ? logs.filter((l) => l.habitId === detailHabit.id) : []),
    [logs, detailHabit]
  );
  const confirmingHabit = useMemo(
    () => (confirmingId ? habits.find((habit) => habit.id === confirmingId) ?? null : null),
    [confirmingId, habits]
  );

  function cancelDelete() {
    setConfirmingId(null);
    setConfirmText("");
  }

  // One-time migration: if any habit predates the manual `order` field,
  // assign initial order from the current sort and persist it. Guarded so
  // this runs once per session, not on every habits refresh.
  const migratedRef = useRef(false);
  useEffect(() => {
    // `!repo` is load-bearing, not defensive. This used to claim the one-shot
    // ref on the first non-loading pass — which was the pass where the session
    // had not resolved and the repository was still the seeded mock. The ref
    // was then spent, so the migration could never run for the real
    // repository, and habits genuinely missing sort_order (onboarding creates
    // exactly those) were never backfilled.
    if (!repo || loading || migratedRef.current) return;
    migratedRef.current = true;
    if (habits.length === 0) return;
    const missingOrder = habits.some((h) => h.order === undefined);
    if (!missingOrder) return;
    const assigned = assignInitialOrder(habits);
    const changed = assigned.filter((h) => {
      const before = habits.find((o) => o.id === h.id);
      return before?.order !== h.order;
    });
    void (async () => {
      await Promise.all(changed.map((h) => repo.upsertHabit(h)));
      await refresh();
    })();
  }, [loading, habits, repo, refresh]);

  function openNewDrawer() {
    setDetailHabitId(null);
    setDrawerInitial(undefined);
    setDrawerOpen(true);
  }

  function openFromTemplate(t: HabitTemplate) {
    setDetailHabitId(null);
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

  function openDetail(habit: Habit) {
    setDrawerOpen(false);
    setDetailHabitId(habit.id);
  }

  async function addHabit(h: Habit) {
    if (!repo) return;
    await repo.upsertHabit(h);
    setDrawerOpen(false);
    await refresh();
    setStatusMessage(`${h.name} added.`);
  }

  async function saveHabit(h: Habit) {
    if (!repo) return;
    await repo.upsertHabit(h);
    await refresh();
    setStatusMessage(`${h.name} saved.`);
  }

  async function archive(id: string) {
    if (!repo) return;
    await repo.archiveHabit(id);
    await refresh();
    const habit = habits.find((item) => item.id === id);
    setStatusMessage(habit ? `${habit.name} archived.` : "Habit archived.");
  }

  async function confirmDelete(habit: Habit) {
    const typed = confirmText.trim().toLowerCase();
    if (typed !== "delete" && typed !== habit.name.trim().toLowerCase()) return;
    if (!repo) return;
    await repo.deleteHabit(habit.id);
    setConfirmingId(null);
    setConfirmText("");
    await refresh();
    setStatusMessage(`${habit.name} deleted.`);
  }

  async function persistReorder(fromId: string, toId: string) {
    if (!repo || fromId === toId) return;
    const next = reorder(habits, fromId, toId);
    const changed = next.filter((h) => {
      const before = habits.find((o) => o.id === h.id);
      return before?.order !== h.order;
    });
    if (changed.length === 0) return;
    await Promise.all(changed.map((h) => repo.upsertHabit(h)));
    await refresh();
    setStatusMessage("Habit order saved.");
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    if (!draggingId || draggingId === id) return;
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, id: string) {
    e.preventDefault();
    const fromId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (fromId && fromId !== id) void persistReorder(fromId, id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleReorderKeyDown(e: React.KeyboardEvent<HTMLLIElement>, habitId: string) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const visible = rows.map((r) => r.habit);
    const idx = visible.findIndex((h) => h.id === habitId);
    if (idx < 0) return;
    const neighborIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= visible.length) return;
    void persistReorder(habitId, visible[neighborIdx].id);
  }

  return (
    <AppFrame>
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
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
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-[var(--dur-micro)] active:scale-[0.97] [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
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
            return (
              <li
                key={habit.id}
                onDragOver={(e) => handleDragOver(e, habit.id)}
                onDrop={(e) => handleDrop(e, habit.id)}
                onKeyDown={(e) => handleReorderKeyDown(e, habit.id)}
                className={
                  "flex items-center gap-1 overflow-hidden rounded-xl border pr-3 [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] " +
                  (!reducedMotion ? "transition-[opacity,box-shadow] duration-[var(--dur-micro)] " : "") +
                  (draggingId === habit.id ? "opacity-50 " : "") +
                  (dragOverId === habit.id && draggingId !== habit.id
                    ? "[box-shadow:inset_0_2px_0_0_rgb(var(--accent)),inset_0_-2px_0_0_rgb(var(--accent))] "
                    : "")
                }
                style={{ borderLeft: `3px solid ${habit.color}` }}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, habit.id)}
                  onDragEnd={handleDragEnd}
                  aria-label={`Reorder ${habit.name}. Drag, or focus this row and press Alt+Up or Alt+Down.`}
                  className="ml-3 shrink-0 cursor-grab select-none rounded px-1 py-3 leading-none [color:rgb(var(--text-mute))] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
                >
                  <span aria-hidden="true">⠿</span>
                </button>

                <button
                  type="button"
                  onClick={() => openDetail(habit)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
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
                </button>

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
              </li>
            );
          })}
        </ul>
      )}

      <HabitDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New habit">
        <HabitForm onSubmit={addHabit} initial={drawerInitial} />
      </HabitDrawer>

      <HabitDrawer
        open={detailHabitId !== null}
        onClose={() => setDetailHabitId(null)}
        title={detailHabit?.name ?? "Habit"}
      >
        {detailHabit && (
          <HabitDetail habit={detailHabit} logs={detailLogs} onLog={log} onSaved={saveHabit} />
        )}
      </HabitDrawer>

      <ConfirmDeleteDialog
        habit={confirmingHabit}
        value={confirmText}
        onChange={setConfirmText}
        onCancel={cancelDelete}
        onConfirm={() => {
          if (confirmingHabit) void confirmDelete(confirmingHabit);
        }}
      />
    </AppFrame>
  );
}

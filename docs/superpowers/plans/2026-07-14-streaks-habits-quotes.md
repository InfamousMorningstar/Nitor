# Streak-freeze, Advanced Habit Management, Fresh Quotes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an earned per-habit streak-freeze (ask-first), advanced habit management (drawer detail tabs, back-dated 7-day log editor, drag reorder), and a verified quote pool that tops up from Supabase — plus a user-facing feature doc and a landing strip.

**Architecture:** Pure domain modules (`freezes.ts`, quote source seam) are built and unit-tested first with zero UI. `computeStreak` gains one condition (`isFreeze` counts like a grace day). The Today page and the habit drawer consume the domain. Quotes degrade gracefully to the bundled pool when Supabase env vars are absent.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4 (arbitrary-value classes), Vitest + Testing Library, Zustand (settings store), Supabase (`public.quotes`, RLS select-only).

## Global Constraints

- Tests run with `npx vitest run <path>`; typecheck with `npx tsc --noEmit`. Suite is currently **96 passing** — never regress it.
- Tests live under `tests/` mirroring `src/` (e.g. `tests/domain/freezes.test.ts`), NOT beside source.
- Follow existing style: arbitrary-value Tailwind (`[color:rgb(var(--text))]`), CSS var tokens, `font-[family-name:var(--font-*)]`, the `focus-visible:outline focus-visible:outline-2` focus-ring convention. Match surrounding code — do not "canonicalize" classes.
- Honor `prefers-reduced-motion: reduce` for any new motion.
- Quote hard-rule: every quote MUST have a real, checkable **primary** source. Drop any candidate that can't be verified. No aggregator/quote-site citations.
- Dates are `YYYY-MM-DD` strings. Helpers in `src/domain/dates.ts`: `today()`, `addDays(date,n)`, `diffDays(a,b)` (= a−b in days), `weekdayOf(date)`.
- Commit after each task with a `feat:`/`test:`/`docs:`/`chore:` message + the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. Work on `main` (repo baseline).

---

## File Structure

**Phase A — Streak-freeze**
- Create `src/domain/freezes.ts` — earn/bank simulation + rescuable-miss detection (pure).
- Modify `src/domain/types.ts` — add `Log.isFreeze?: boolean`.
- Modify `src/domain/streaks.ts` — `computeStreak` treats `isFreeze` like `isGraceDay`.
- Modify `src/data/repository.ts` — `LogInput.isFreeze?: boolean`.
- Modify `src/data/mock/MockHabitRepository.ts` — persist `isFreeze` in `logValue`.
- Create `src/components/today/FreezePrompt.tsx` — the ask-first card.
- Modify `src/app/today/page.tsx` — render prompts.
- Tests: `tests/domain/freezes.test.ts`, extend `tests/domain/streaks.test.ts`.

**Phase B — Advanced habit management**
- Modify `src/domain/types.ts` — add `Habit.order?: number`.
- Create `src/domain/habitOrder.ts` — sort + reorder + migration helpers (pure).
- Create `src/domain/backdate.ts` — the editable 7-day window helper (pure).
- Create `src/components/habits/HabitDetail.tsx` — tabbed Overview/Edit/History.
- Create `src/components/stats/MiniHeatmap.tsx` — ~13-week compact heatmap.
- Modify `src/app/habits/page.tsx` — drag reorder + open detail drawer.
- Delete `src/app/habits/[id]/page.tsx` (+ its folder); add redirect.
- Tests: `tests/domain/habitOrder.test.ts`, `tests/domain/backdate.test.ts`.

**Phase C — Quotes + docs + landing**
- Modify `src/domain/quotes.ts` — expand pool, add `QuoteSource`, merged `quoteOfDay`.
- Create `src/data/quotes/remote.ts` — Supabase fetch + validate + cache + merge.
- Create `supabase/quotes.sql` — table + RLS + grant.
- Create `scripts/seed-quotes.ts` — push bundled pool to Supabase.
- Create `docs/features/how-it-works.md` — user-facing explainer (TRACKED in git).
- Create `src/components/marketing/HowItWorks.tsx` — landing strip.
- Modify `src/components/marketing/Hero.tsx` or the landing page — mount the strip under the hero.
- Tests: extend `tests/domain/quotes.test.ts`, create `tests/data/quotesRemote.test.ts`.

---

# PHASE A — Streak-freeze

### Task 1: `Log.isFreeze` + streak engine recognizes it

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/streaks.ts:53,65` (the two `isComplete || isGraceDay` conditions)
- Test: `tests/domain/streaks.test.ts`

**Interfaces:**
- Produces: `Log.isFreeze?: boolean`; `computeStreak` bridges a gap on an `isFreeze` day.

- [ ] **Step 1: Write the failing test** — append to `tests/domain/streaks.test.ts`:

```ts
it("treats an isFreeze log like a completed day so the streak survives one miss", () => {
  const habit = makeHabit({ schedule: { kind: "daily" }, createdAt: "2026-01-01" });
  // complete Jan1-3, "miss" Jan4 but protect it with a freeze, complete Jan5
  const logs: Log[] = [
    log(habit.id, "2026-01-01", true),
    log(habit.id, "2026-01-02", true),
    log(habit.id, "2026-01-03", true),
    { id: "f", habitId: habit.id, date: "2026-01-04", value: false, isGraceDay: false, isFreeze: true, createdAt: "" },
    log(habit.id, "2026-01-05", true),
  ];
  expect(computeStreak(habit, logs, "2026-01-05").current).toBe(5);
});
```

(Use the file's existing `makeHabit`/`log` helpers; add a local `log` helper if absent that returns a `Log` with `isGraceDay:false`.)

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/domain/streaks.test.ts` → FAIL (current is 3, freeze day breaks it).

- [ ] **Step 3: Add the field** in `src/domain/types.ts` `Log` interface, after `isGraceDay`:

```ts
  isGraceDay: boolean;
  /** true when this day was rescued by spending an earned streak-freeze */
  isFreeze?: boolean;
```

- [ ] **Step 4: Update `computeStreak`** in `src/domain/streaks.ts`. Change both occurrences of the completion condition (current-streak loop and longest-streak loop) from:

```ts
if (isComplete(habit, l) || l?.isGraceDay) {
```
to:
```ts
if (isComplete(habit, l) || l?.isGraceDay || l?.isFreeze) {
```

Also update the momentum loop's `good` condition the same way (`isComplete(...) || l?.isGraceDay || l?.isFreeze`).

- [ ] **Step 5: Run to verify pass** — `npx vitest run tests/domain/streaks.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/streaks.ts tests/domain/streaks.test.ts
git commit -m "feat(domain): streak-freeze logs bridge a missed day in computeStreak"
```

---

### Task 2: `freezes.ts` — earn/bank simulation

**Files:**
- Create: `src/domain/freezes.ts`
- Test: `tests/domain/freezes.test.ts`

**Interfaces:**
- Consumes: `isScheduledOn`, `isComplete` from `streaks.ts`; `addDays`, `diffDays` from `dates.ts`; `computeStreak` from `streaks.ts`.
- Produces:
  - `EARN_EVERY = 7`, `BANK_CAP = 2`, `MIN_STREAK_TO_PROMPT = 3`
  - `freezeBank(habit: Habit, logs: Log[], asOf: string): number` — current bank 0..2.
  - `rescuableMiss(habit: Habit, logs: Log[], asOf: string): string | null` — the single date a freeze may rescue now, else null.

- [ ] **Step 1: Write the failing tests** — `tests/domain/freezes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Habit, Log } from "@/domain/types";
import { freezeBank, rescuableMiss } from "@/domain/freezes";

const daily = (over: Partial<Habit> = {}): Habit => ({
  id: "h", name: "Read", emoji: "📖", color: "#fff", category: "mind",
  type: "boolean", targetValue: null, schedule: { kind: "daily" },
  strictness: "balanced", graceDaysPerWeek: 0, archived: false,
  createdAt: "2026-01-01", ...over,
});
const done = (date: string): Log => ({ id: date, habitId: "h", date, value: true, isGraceDay: false, createdAt: "" });
const freeze = (date: string): Log => ({ id: date, habitId: "h", date, value: false, isGraceDay: false, isFreeze: true, createdAt: "" });
const range = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDaysStr(start, i));
function addDaysStr(d: string, n: number) { const dt = new Date(d + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); }

describe("freezeBank", () => {
  it("grants +1 per 7 completed scheduled days, capped at 2", () => {
    const h = daily();
    expect(freezeBank(h, range("2026-01-01", 6).map(done), "2026-01-06")).toBe(0);
    expect(freezeBank(h, range("2026-01-01", 7).map(done), "2026-01-07")).toBe(1);
    expect(freezeBank(h, range("2026-01-01", 14).map(done), "2026-01-14")).toBe(2);
    expect(freezeBank(h, range("2026-01-01", 28).map(done), "2026-01-28")).toBe(2); // cap holds
  });
  it("resets the earn counter on an unprotected miss", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 6).map(done) /* miss Jan7 */, ...range("2026-01-08", 3).map(done)];
    expect(freezeBank(h, logs, "2026-01-10")).toBe(0);
  });
  it("decrements the bank when a freeze is spent", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 7).map(done), freeze("2026-01-08"), ...range("2026-01-09", 2).map(done)];
    expect(freezeBank(h, logs, "2026-01-10")).toBe(0); // earned 1, spent 1
  });
});

describe("rescuableMiss", () => {
  it("returns the isolated missed day when a freeze could save a ≥3 streak", () => {
    const h = daily();
    // done Jan1-5, miss Jan6, today Jan7
    const logs = range("2026-01-01", 5).map(done);
    expect(rescuableMiss(h, logs, "2026-01-07")).toBe("2026-01-06");
  });
  it("returns null for two consecutive misses", () => {
    const h = daily();
    const logs = range("2026-01-01", 5).map(done); // miss Jan6 AND Jan7, today Jan8
    expect(rescuableMiss(h, logs, "2026-01-08")).toBeNull();
  });
  it("returns null when the streak before the miss is under the threshold", () => {
    const h = daily();
    const logs = [done("2026-01-05")]; // only 1-day streak before miss Jan6
    expect(rescuableMiss(h, logs, "2026-01-07")).toBeNull();
  });
  it("returns null once the day is already protected", () => {
    const h = daily();
    const logs = [...range("2026-01-01", 5).map(done), freeze("2026-01-06")];
    expect(rescuableMiss(h, logs, "2026-01-07")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/domain/freezes.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `src/domain/freezes.ts`:

```ts
import type { Habit, Log } from "@/domain/types";
import { addDays, diffDays } from "@/domain/dates";
import { isScheduledOn, isComplete, computeStreak } from "@/domain/streaks";

export const EARN_EVERY = 7;
export const BANK_CAP = 2;
export const MIN_STREAK_TO_PROMPT = 3;

function byDate(logs: Log[]): Map<string, Log> {
  const m = new Map<string, Log>();
  for (const l of logs) m.set(l.date, l);
  return m;
}

/** Current freeze bank (0..BANK_CAP) via a chronological earn/spend simulation. */
export function freezeBank(habit: Habit, logs: Log[], asOf: string): number {
  const map = byDate(logs);
  let bank = 0;
  let counter = 0;
  for (let d = habit.createdAt; diffDays(asOf, d) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    const l = map.get(d);
    if (l?.isFreeze) {
      bank = Math.max(0, bank - 1); // spend
      counter++; // protected day counts toward the next earn
    } else if (isComplete(habit, l) || l?.isGraceDay) {
      counter++;
    } else {
      counter = 0; // unprotected miss breaks the earn run
      continue;
    }
    if (counter >= EARN_EVERY) {
      counter = 0;
      if (bank < BANK_CAP) bank++;
    }
  }
  return bank;
}

/** The single date a freeze could rescue right now, or null. */
export function rescuableMiss(habit: Habit, logs: Log[], asOf: string): string | null {
  const map = byDate(logs);
  // most recent scheduled day strictly before asOf
  let d1: string | null = null;
  for (let d = addDays(asOf, -1); diffDays(d, habit.createdAt) >= 0; d = addDays(d, -1)) {
    if (isScheduledOn(habit, d)) { d1 = d; break; }
  }
  if (!d1) return null;
  const l1 = map.get(d1);
  const missed = !(isComplete(habit, l1) || l1?.isGraceDay || l1?.isFreeze);
  if (!missed) return null;
  // previous scheduled day must be completed (isolated miss) and streak ≥ threshold
  let d0: string | null = null;
  for (let d = addDays(d1, -1); diffDays(d, habit.createdAt) >= 0; d = addDays(d, -1)) {
    if (isScheduledOn(habit, d)) { d0 = d; break; }
  }
  if (!d0) return null;
  const l0 = map.get(d0);
  if (!(isComplete(habit, l0) || l0?.isGraceDay || l0?.isFreeze)) return null;
  if (computeStreak(habit, logs, d0).current < MIN_STREAK_TO_PROMPT) return null;
  return d1;
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/domain/freezes.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/freezes.ts tests/domain/freezes.test.ts
git commit -m "feat(domain): freeze bank + rescuable-miss engine"
```

---

### Task 3: Thread `isFreeze` through the repository

**Files:**
- Modify: `src/data/repository.ts` (`LogInput`)
- Modify: `src/data/mock/MockHabitRepository.ts:28-42` (`logValue`)
- Test: reuse existing `tests/data/MockHabitRepository.test.ts` (add one case)

**Interfaces:**
- Produces: `LogInput.isFreeze?: boolean`; `logValue` persists it.

- [ ] **Step 1: Write the failing test** — append to `tests/data/MockHabitRepository.test.ts`:

```ts
it("persists isFreeze on a logged value", async () => {
  const repo = createSeededRepository();
  const [h] = await repo.listHabits();
  const l = await repo.logValue({ habitId: h.id, date: "2026-02-02", value: false, isFreeze: true });
  expect(l.isFreeze).toBe(true);
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run tests/data/MockHabitRepository.test.ts` → FAIL (type error / undefined).

- [ ] **Step 3: Add `isFreeze` to `LogInput`** in `src/data/repository.ts`:

```ts
export interface LogInput {
  habitId: string;
  date: string;
  value: number | boolean;
  note?: string;
  isGraceDay?: boolean;
  isFreeze?: boolean;
}
```

- [ ] **Step 4: Persist it** in `MockHabitRepository.logValue`, add to the constructed `log`:

```ts
      isGraceDay: input.isGraceDay ?? false,
      isFreeze: input.isFreeze ?? false,
      createdAt: new Date().toISOString(),
```

- [ ] **Step 5: Run to verify pass** — `npx vitest run tests/data/MockHabitRepository.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/repository.ts src/data/mock/MockHabitRepository.ts tests/data/MockHabitRepository.test.ts
git commit -m "feat(data): thread isFreeze through logValue"
```

---

### Task 4: Ask-first FreezePrompt on Today

**Files:**
- Create: `src/components/today/FreezePrompt.tsx`
- Modify: `src/app/today/page.tsx`
- (Verify) `src/state/useHabits.ts` `log()` forwards `isFreeze` — it passes `LogInput` through, so no change expected; confirm.

**Interfaces:**
- Consumes: `freezeBank`, `rescuableMiss`, `MIN_STREAK_TO_PROMPT`; `computeStreak`; `useHabits().log`.
- Produces: a per-habit inline card; on "Use a freeze" calls `log({ habitId, date: missedDate, value: false, isFreeze: true })`.

- [ ] **Step 1: Build the component** `src/components/today/FreezePrompt.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { Habit, Log } from "@/domain/types";
import { computeStreak } from "@/domain/streaks";
import { weekdayOf } from "@/domain/dates";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DISMISS_KEY = "nitor.freezeDismissed";

function readDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]")); } catch { return new Set(); }
}
function dismiss(key: string) {
  const s = readDismissed(); s.add(key);
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...s]));
}

export function FreezePrompt({
  habit, logs, missedDate, onUse,
}: {
  habit: Habit; logs: Log[]; missedDate: string;
  onUse: () => void;
}) {
  const key = `${habit.id}:${missedDate}`;
  const [hidden, setHidden] = useState(() => readDismissed().has(key));
  if (hidden) return null;
  const streak = computeStreak(habit, logs, missedDate).current;
  const day = WEEKDAYS[weekdayOf(missedDate)];

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface))]">
      <span className="text-lg" aria-hidden>🛡</span>
      <p className="flex-1 text-sm [color:rgb(var(--text-dim))]">
        Protect your <strong className="[color:rgb(var(--text))]">{streak}-day {habit.name}</strong> streak? You missed {day}.
      </p>
      <button
        type="button"
        onClick={onUse}
        className="rounded-full px-4 py-2 text-sm font-medium [background:rgb(var(--accent))] [color:rgb(var(--bg))] transition-transform duration-[var(--dur-micro)] active:scale-[0.98] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        Use a freeze
      </button>
      <button
        type="button"
        onClick={() => { dismiss(key); setHidden(true); }}
        className="text-sm [color:rgb(var(--text-mute))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        Let it reset
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Today** — in `src/app/today/page.tsx`, add imports and compute prompts, render above the habit list (after `<QuoteCard />`).

Add imports:
```tsx
import { useSettings } from "@/state/settingsStore";
import { freezeBank, rescuableMiss } from "@/domain/freezes";
import { FreezePrompt } from "@/components/today/FreezePrompt";
```

After `withStatus` memo, add:
```tsx
const settings = useSettings();
const prompts = useMemo(() => {
  if (!settings.streakFreeze) return [];
  return habits
    .filter((h) => !h.archived)
    .map((h) => {
      const habitLogs = logs.filter((l) => l.habitId === h.id);
      const missed = rescuableMiss(h, habitLogs, date);
      if (!missed || freezeBank(h, habitLogs, date) <= 0) return null;
      return { habit: h, habitLogs, missed };
    })
    .filter(Boolean) as { habit: typeof habits[number]; habitLogs: typeof logs; missed: string }[];
}, [habits, logs, date, settings.streakFreeze]);
```

Render right after `<QuoteCard />`:
```tsx
{prompts.map(({ habit, habitLogs, missed }) => (
  <FreezePrompt
    key={habit.id}
    habit={habit}
    logs={habitLogs}
    missedDate={missed}
    onUse={() => log({ habitId: habit.id, date: missed, value: false, isFreeze: true })}
  />
))}
```

(Confirm `useSettings` is the settings-store hook export name; adjust import to match `src/state/settingsStore.ts`.)

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 4: Manual verify** — start dev server, seed a habit with a rescuable miss (or temporarily craft one), confirm the card renders, "Use a freeze" makes it vanish and the streak holds, "Let it reset" dismisses and does not reappear on reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/today/FreezePrompt.tsx src/app/today/page.tsx
git commit -m "feat(today): ask-first streak-freeze prompt"
```

---

# PHASE B — Advanced habit management

### Task 5: `Habit.order` + ordering helpers

**Files:**
- Modify: `src/domain/types.ts` (add `order?: number`)
- Create: `src/domain/habitOrder.ts`
- Test: `tests/domain/habitOrder.test.ts`

**Interfaces:**
- Produces:
  - `sortHabits(habits: Habit[]): Habit[]` — by `order ?? Infinity`, tie-break `createdAt` then `id`.
  - `assignInitialOrder(habits: Habit[]): Habit[]` — fills missing `order` from sorted index.
  - `reorder(habits: Habit[], fromId: string, toId: string): Habit[]` — returns habits with rewritten `order` (0..n-1) after moving `fromId` to `toId`'s slot.

- [ ] **Step 1: Failing test** `tests/domain/habitOrder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Habit } from "@/domain/types";
import { sortHabits, assignInitialOrder, reorder } from "@/domain/habitOrder";

const h = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, emoji: "•", color: "#fff", category: "c", type: "boolean",
  targetValue: null, schedule: { kind: "daily" }, strictness: "balanced",
  graceDaysPerWeek: 0, archived: false, createdAt: "2026-01-01", ...over,
});

it("sorts by order then createdAt", () => {
  const list = [h("b", { order: 1 }), h("a", { order: 0 }), h("c")];
  expect(sortHabits(list).map((x) => x.id)).toEqual(["a", "b", "c"]);
});
it("assigns initial order from sorted index", () => {
  const list = assignInitialOrder([h("a"), h("b")]);
  expect(list.map((x) => x.order)).toEqual([0, 1]);
});
it("reorders and rewrites contiguous order values", () => {
  const list = assignInitialOrder([h("a"), h("b"), h("c")]);
  const moved = reorder(list, "c", "a"); // move c to a's slot
  expect(moved.map((x) => x.id)).toEqual(["c", "a", "b"]);
  expect(moved.map((x) => x.order)).toEqual([0, 1, 2]);
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run tests/domain/habitOrder.test.ts`.

- [ ] **Step 3: Add field** in `types.ts` `Habit`: `/** manual sort position; lower = higher in the list */ order?: number;`

- [ ] **Step 4: Implement** `src/domain/habitOrder.ts`:

```ts
import type { Habit } from "@/domain/types";

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export function assignInitialOrder(habits: Habit[]): Habit[] {
  return sortHabits(habits).map((h, i) => ({ ...h, order: i }));
}

export function reorder(habits: Habit[], fromId: string, toId: string): Habit[] {
  const sorted = sortHabits(habits);
  const from = sorted.findIndex((h) => h.id === fromId);
  const to = sorted.findIndex((h) => h.id === toId);
  if (from < 0 || to < 0) return sorted.map((h, i) => ({ ...h, order: i }));
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  return sorted.map((h, i) => ({ ...h, order: i }));
}
```

- [ ] **Step 5: Run → PASS**. **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/habitOrder.ts tests/domain/habitOrder.test.ts
git commit -m "feat(domain): habit ordering + reorder helpers"
```

---

### Task 6: Back-date window helper

**Files:**
- Create: `src/domain/backdate.ts`
- Test: `tests/domain/backdate.test.ts`

**Interfaces:**
- Produces: `BACKDATE_DAYS = 7`; `editableDays(habit: Habit, asOf: string): { date: string; scheduled: boolean }[]` — the last `BACKDATE_DAYS` calendar days ending at `asOf` (newest first), each flagged whether the habit was scheduled that day.

- [ ] **Step 1: Failing test** `tests/domain/backdate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Habit } from "@/domain/types";
import { editableDays, BACKDATE_DAYS } from "@/domain/backdate";

const daily: Habit = {
  id: "h", name: "R", emoji: "•", color: "#fff", category: "c", type: "boolean",
  targetValue: null, schedule: { kind: "daily" }, strictness: "balanced",
  graceDaysPerWeek: 0, archived: false, createdAt: "2026-01-01",
};

it("returns the last 7 days newest-first", () => {
  const days = editableDays(daily, "2026-02-10");
  expect(days).toHaveLength(BACKDATE_DAYS);
  expect(days[0].date).toBe("2026-02-10");
  expect(days[6].date).toBe("2026-02-04");
  expect(days.every((d) => d.scheduled)).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL**. **Step 3: Implement** `src/domain/backdate.ts`:

```ts
import type { Habit } from "@/domain/types";
import { addDays } from "@/domain/dates";
import { isScheduledOn } from "@/domain/streaks";

export const BACKDATE_DAYS = 7;

export function editableDays(habit: Habit, asOf: string): { date: string; scheduled: boolean }[] {
  const out: { date: string; scheduled: boolean }[] = [];
  for (let i = 0; i < BACKDATE_DAYS; i++) {
    const date = addDays(asOf, -i);
    out.push({ date, scheduled: isScheduledOn(habit, date) });
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit**

```bash
git add src/domain/backdate.ts tests/domain/backdate.test.ts
git commit -m "feat(domain): 7-day back-date editable window"
```

---

### Task 7: MiniHeatmap component

**Files:**
- Create: `src/components/stats/MiniHeatmap.tsx`
- Reference pattern: `src/components/stats/YearHeatmap.tsx` (colors, cell rendering, aria).

**Interfaces:**
- Consumes: `Habit`, `Log[]`, `isScheduledOn`, `isComplete`.
- Produces: `<MiniHeatmap habit={habit} logs={logs} weeks={13} />` — a compact grid of the last `weeks*7` days, amber-filled by completion, `isFreeze`/grace days marked distinctly, with `title`/aria per cell.

- [ ] **Step 1: Implement** following `YearHeatmap.tsx`'s cell/color approach but limited to `weeks` columns (default 13). Each cell: filled amber when `isComplete`; a subtler amber ring when `isGraceDay || isFreeze`; faint when scheduled-but-missed; nearly transparent when not scheduled. Include `role="img"` + `aria-label` summarizing completion count. Keep it self-contained (no chart lib), matching existing SVG/div-grid style.

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/stats/MiniHeatmap.tsx
git commit -m "feat(stats): compact 13-week mini-heatmap"
```

---

### Task 8: HabitDetail drawer (Overview / Edit / History)

**Files:**
- Create: `src/components/habits/HabitDetail.tsx`
- Reference: `src/components/habits/HabitForm.tsx` (Edit tab reuse), `HabitDrawer.tsx` (host).

**Interfaces:**
- Consumes: `MiniHeatmap`, `computeStreak`, `freezeBank`, `editableDays`, `useHabits().log` + `upsertHabit` path.
- Produces: `<HabitDetail habit logs onSaved onLog />` rendered inside the existing `HabitDrawer`.

- [ ] **Step 1: Build** a three-tab panel (local `useState<"overview"|"edit"|"history">`). Tab bar uses the mono-eyebrow style. 
  - **Overview:** `<MiniHeatmap>`, current/longest via `computeStreak`, momentum, and freeze bank as `🛡` × `freezeBank(habit, logs, today())` with dimmed empty slots up to `BANK_CAP`.
  - **Edit:** render the existing `HabitForm` in edit mode (pass the habit; on save call the same `upsertHabit` path the Habits page already uses).
  - **History:** map `editableDays(habit, today())`; each scheduled row shows the date, weekday, current status, and a type-appropriate control (checkbox for boolean/quit; number input for count/duration/quantified) that calls `onLog({ habitId, date, value })`. Non-scheduled days render muted "not scheduled". A `🛡`/grace label marks protected days.
- [ ] **Step 2: Typecheck** → clean.
- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitDetail.tsx
git commit -m "feat(habits): tabbed habit detail (overview/edit/history)"
```

---

### Task 9: Wire detail + drag reorder into the Habits page; retire `[id]` route

**Files:**
- Modify: `src/app/habits/page.tsx`
- Delete: `src/app/habits/[id]/page.tsx` (and the `[id]` folder)

**Interfaces:**
- Consumes: `sortHabits`, `assignInitialOrder`, `reorder`, `upsertHabit`, `HabitDetail`, `HabitDrawer`.

- [ ] **Step 1:** On the Habits page, sort the rendered list with `sortHabits`. On first load, if any habit lacks `order`, persist `assignInitialOrder(...)` via `upsertHabit` (one-time migration).
- [ ] **Step 2:** Add drag-to-reorder to the habit rows (HTML5 draggable or pointer handlers): on drop, compute `reorder(habits, fromId, toId)` and persist changed habits via `upsertHabit`. Add keyboard reorder: when a row is focused, `Alt+ArrowUp/ArrowDown` moves it (call `reorder` with the neighbor id). Under `prefers-reduced-motion`, skip drag animation; reflow instantly.
- [ ] **Step 3:** Clicking a habit opens the `HabitDrawer` hosting `<HabitDetail>` (replacing/augmenting the current builder-open behavior). Keep the "new habit" button opening the builder form.
- [ ] **Step 4:** Delete the orphan detail route:

```bash
git rm -r "src/app/habits/[id]"
```
Add a redirect so any old deep link resolves: create `src/app/habits/[id]/page.tsx` as a redirect is NOT wanted (we deleted it) — instead rely on `/habits`. If a redirect is desired, add to `next.config` or a `redirects()` entry mapping `/habits/:id` → `/habits`. (Default: no redirect; the route simply 404s to the app's on-brand 404.)

- [ ] **Step 5:** Full run — `npx vitest run` (96+ pass) and `npx tsc --noEmit` clean. Manual: reorder persists across reload; detail drawer tabs work; back-date edit writes the right log.
- [ ] **Step 6: Commit**

```bash
git add src/app/habits/page.tsx
git rm -r "src/app/habits/[id]"
git commit -m "feat(habits): drawer detail + drag/keyboard reorder; retire stale [id] route"
```

---

# PHASE C — Quotes + docs + landing

### Task 10: Quote source seam + merged `quoteOfDay`

**Files:**
- Modify: `src/domain/quotes.ts`
- Test: extend `tests/domain/quotes.test.ts`

**Interfaces:**
- Produces:
  - `QuoteSource` = `{ all(): Quote[] }`.
  - `setRemoteQuotes(quotes: Quote[]): void` — module-level setter used by the remote loader; validates each has a non-empty `source`.
  - `quoteOfDay(date: string): Quote` — unchanged signature; now rotates over `BUNDLED ∪ remote` (deduped by normalized text).

- [ ] **Step 1: Failing tests** — append to `tests/domain/quotes.test.ts`:

```ts
it("merges validated remote quotes and dedupes by text", () => {
  setRemoteQuotes([
    { text: "  It is not that we have a short time to live, but that we waste a lot of it. ", author: "Seneca", source: "On the Shortness of Life, 1", tradition: "stoic", themes: [] }, // dup of bundled
    { text: "New verified line.", author: "X", source: "Real Source (1999)", tradition: "wisdom", themes: [] },
  ]);
  const all = allQuotes();
  const dupCount = all.filter((q) => q.text.includes("waste a lot of it")).length;
  expect(dupCount).toBe(1);
  expect(all.some((q) => q.text === "New verified line.")).toBe(true);
});
it("rejects remote quotes without a source", () => {
  setRemoteQuotes([{ text: "No source", author: "Y", source: "  ", tradition: "wisdom", themes: [] }]);
  expect(allQuotes().some((q) => q.text === "No source")).toBe(false);
});
```

(Export a small `allQuotes()` test helper or assert via `quoteOfDay` sampling. Reset remote between tests if the store is module-global — add `setRemoteQuotes([])` in `beforeEach`.)

- [ ] **Step 2: Run → FAIL**. **Step 3: Implement** in `quotes.ts`: keep `QUOTES` as the bundled array (now larger — Task 11 fills it), add:

```ts
function normalize(t: string): string { return t.trim().replace(/\s+/g, " ").toLowerCase(); }

let remote: Quote[] = [];

export function setRemoteQuotes(quotes: Quote[]): void {
  remote = quotes.filter((q) => q.source && q.source.trim().length > 0);
}

export function allQuotes(): Quote[] {
  const seen = new Set(QUOTES.map((q) => normalize(q.text)));
  const merged = [...QUOTES];
  for (const q of remote) {
    const key = normalize(q.text);
    if (!seen.has(key)) { seen.add(key); merged.push({ ...q, text: q.text.trim() }); }
  }
  return merged;
}

export function quoteOfDay(date: string): Quote {
  const pool = allQuotes();
  return pool[hashString(date) % pool.length];
}
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit**

```bash
git add src/domain/quotes.ts tests/domain/quotes.test.ts
git commit -m "feat(quotes): source seam with validated, deduped remote merge"
```

---

### Task 11: Expand the bundled verified pool (subagent, batched)

**Files:**
- Modify: `src/domain/quotes.ts` (`QUOTES` array)

- [ ] **Step 1:** Dispatch a subagent (general-purpose) to draft candidate quotes in batches of ~15 across the four traditions (`stoic`, `science`, `wisdom`, `craft`), each with a **verified primary source** (original work, lecture, or interview — not a quote site). The subagent must **web-verify** each attribution and **drop** anything unverifiable.
- [ ] **Step 2:** Review each returned batch; reject any with shaky sourcing. Append survivors to `QUOTES` until the pool reaches **~60–80**.
- [ ] **Step 3:** `npx vitest run tests/domain/quotes.test.ts` → PASS (determinism holds over the larger pool). `npx tsc --noEmit` clean.
- [ ] **Step 4: Commit** (may be several commits as batches land)

```bash
git add src/domain/quotes.ts
git commit -m "content(quotes): expand verified pool toward ~60-80"
```

---

### Task 12: Supabase remote loader (graceful degrade)

**Files:**
- Create: `src/data/quotes/remote.ts`
- Create: `supabase/quotes.sql`
- Create: `scripts/seed-quotes.ts`
- Test: `tests/data/quotesRemote.test.ts`

**Interfaces:**
- Consumes: `setRemoteQuotes` from `quotes.ts`.
- Produces: `loadRemoteQuotes(): Promise<void>` — no-op when env vars absent; else fetch → validate → cache → `setRemoteQuotes`.

- [ ] **Step 1: Failing test** `tests/data/quotesRemote.test.ts` — validation + cache freshness are the testable pure bits; extract them:

```ts
import { describe, it, expect } from "vitest";
import { isFresh, validateRows } from "@/data/quotes/remote";

it("treats a cache newer than 14 days as fresh", () => {
  const now = Date.parse("2026-07-14");
  expect(isFresh(Date.parse("2026-07-10"), now)).toBe(true);
  expect(isFresh(Date.parse("2026-06-01"), now)).toBe(false);
});
it("keeps only rows with a source and required fields", () => {
  const rows = [
    { text: "A", author: "x", source: "S", tradition: "stoic", themes: [] },
    { text: "B", author: "y", source: "", tradition: "stoic", themes: [] },
  ];
  expect(validateRows(rows).map((r) => r.text)).toEqual(["A"]);
});
```

- [ ] **Step 2: Run → FAIL**. **Step 3: Implement** `src/data/quotes/remote.ts`:

```ts
import type { Quote } from "@/domain/quotes";
import { setRemoteQuotes } from "@/domain/quotes";

const CACHE_KEY = "nitor.quotes.cache";
const AT_KEY = "nitor.quotes.fetchedAt";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < MAX_AGE_MS;
}

export function validateRows(rows: Partial<Quote>[]): Quote[] {
  return rows.filter(
    (r): r is Quote => !!r.text && !!r.author && !!r.source && r.source.trim().length > 0 && !!r.tradition
  );
}

export async function loadRemoteQuotes(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 1. warm from cache immediately
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) setRemoteQuotes(validateRows(JSON.parse(cached)));
  } catch {}
  if (!url || !key) return; // not provisioned → bundled-only
  const at = Number(localStorage.getItem(AT_KEY) ?? 0);
  if (isFresh(at, Date.now())) return; // cache still fresh
  try {
    const res = await fetch(`${url}/rest/v1/quotes?select=text,author,source,tradition,themes`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return;
    const rows = validateRows(await res.json());
    setRemoteQuotes(rows);
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
    localStorage.setItem(AT_KEY, String(Date.now()));
  } catch { /* keep last good cache */ }
}
```

Call `loadRemoteQuotes()` once on app mount (e.g. in the client provider that already runs on load — wire a `useEffect(() => { void loadRemoteQuotes(); }, [])`). Confirm `Quote` is exported from `quotes.ts` (it is).

- [ ] **Step 4: Run → PASS** — `npx vitest run tests/data/quotesRemote.test.ts`.

- [ ] **Step 5: Write `supabase/quotes.sql`:**

```sql
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null,
  source text not null,
  tradition text not null check (tradition in ('stoic','science','wisdom','craft')),
  themes text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.quotes enable row level security;
create policy "public read" on public.quotes for select using (true);
grant select on public.quotes to anon;
```

- [ ] **Step 6: Write `scripts/seed-quotes.ts`** — a Node script that reads `QUOTES` and inserts rows via the Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`, server-only), idempotent on `text`. Include a header comment: "Run after provisioning: `npx tsx scripts/seed-quotes.ts`."

- [ ] **Step 7: Commit**

```bash
git add src/data/quotes/remote.ts supabase/quotes.sql scripts/seed-quotes.ts tests/data/quotesRemote.test.ts
git commit -m "feat(quotes): Supabase remote loader + schema + seed (degrades to bundled)"
```

> **Provisioning (out of band, needs authorized Supabase connector / interactive session):** create the project, run `supabase/quotes.sql`, set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` for seeding), then `npx tsx scripts/seed-quotes.ts`. Consult the `supabase` skill.

---

### Task 13: `docs/features/how-it-works.md` (tracked)

**Files:**
- Create: `docs/features/how-it-works.md` (git-tracked via the `.gitignore` `!docs/features/` negation already added)

- [ ] **Step 1:** Write a polished, plain-language, user-facing doc. Sections: **Forgiving streaks** (grace days vs earned freezes; earn 1 per 7 kept days, bank up to 2, we always ask before spending one), **Fix any day** (open a habit to see its history, correct any of the last 7 days, drag to reorder, per-habit heatmap + freeze bank), **Quotes that stay fresh** (every quote has a real source; the set rotates daily and grows over time). No internal jargon, no code.
- [ ] **Step 2: Commit**

```bash
git add docs/features/how-it-works.md
git commit -m "docs(features): user-facing how-it-works explainer"
```

---

### Task 14: Landing "How it works" strip under the hero

**Files:**
- Create: `src/components/marketing/HowItWorks.tsx`
- Modify: the landing composition so the strip mounts directly under the hero (check where `Hero` is rendered — likely `src/app/page.tsx` or a landing component; insert `<HowItWorks />` after `<Hero />` and before the scroll story).

**Interfaces:**
- Produces: `<HowItWorks />` — 3 matte cards (**Forgiving streaks · Fix any day · Quotes that stay fresh**), one line each, styled like the existing Why-Nitor strip, with a "How it works →" link to the feature doc (or an on-site route if preferred).

- [ ] **Step 1:** Build the strip reusing the landing's card/section styling (reference the existing Why-Nitor strip in the marketing components for spacing, borders, type). Reduced-motion safe (reveal animations optional and gated).
- [ ] **Step 2:** Mount under the hero. `npx tsc --noEmit` clean.
- [ ] **Step 3: Manual verify** — landing renders the strip under the hero in both themes; links work; no layout shift.
- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/HowItWorks.tsx src/app/page.tsx
git commit -m "feat(landing): how-it-works strip under the hero"
```

---

### Task 15: Close-out

- [ ] **Step 1:** `npx vitest run` — all pass (expect ~110+). `npx tsc --noEmit` clean. `npm run build` succeeds.
- [ ] **Step 2:** Playwright pass: Today freeze prompt (use + dismiss), habit detail drawer tabs + back-date edit + reorder persistence, landing strip both themes.
- [ ] **Step 3:** Update `PROGRESS.md` (move items 1–3 to Done; note Supabase provisioning pending) and append a `.remember/now.md` entry.
- [ ] **Step 4:** `git push origin main`.

---

## Self-Review

**Spec coverage:** freeze earn/bank/ask-first → Tasks 1–4; grace-day coexistence → preserved (separate field, Task 1). Advanced habit mgmt (reorder/detail/back-date) → Tasks 5–9; retire `[id]` → Task 9. Quotes verified pool + Supabase top-up + graceful degrade → Tasks 10–12. Feature doc → Task 13; landing strip → Task 14. All spec sections mapped.

**Placeholder scan:** domain tasks (1,2,3,5,6,10,12) carry complete test + impl code. UI tasks (4,7,8,9,14) give real component code or precise, pattern-referenced steps (JSX that depends on unread files — HabitForm internals, Why-Nitor strip markup — is intentionally delegated to "follow the referenced pattern" rather than inventing markup that may not match; the implementer reads the reference file named in each task). Task 11 (content) is inherently generative + verified, not code.

**Type consistency:** `isFreeze` used identically across `Log`, `LogInput`, `computeStreak`, `freezes.ts`, and the Today wiring. `Quote`/`setRemoteQuotes`/`allQuotes`/`quoteOfDay` names consistent between Tasks 10 and 12. `sortHabits`/`assignInitialOrder`/`reorder` consistent between Tasks 5 and 9. `editableDays`/`BACKDATE_DAYS` consistent between Tasks 6 and 8.

**Known follow-ups (not blockers):** Task 4 assumes `useSettings` export name and that `useHabits().log` forwards `isFreeze` — both flagged to confirm at implementation. Task 9 redirect for `/habits/[id]` is optional (default: on-brand 404).

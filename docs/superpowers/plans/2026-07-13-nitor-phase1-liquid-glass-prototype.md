# Nitor Phase 1 — Liquid Glass Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully clickable Next.js front end for Nitor (a habit tracker) on realistic mock data, showcasing an iOS 26 "Liquid Glass" aesthetic, with no backend/auth.

**Architecture:** Next.js App Router + TypeScript + Tailwind v4. All UI reads from a typed `HabitRepository` interface with an in-memory `MockHabitRepository` (Phase 2 will add a Supabase implementation behind the same interface). Pure domain logic (streaks, momentum, insights) lives in framework-free modules and is unit-tested with Vitest. A single `<Glass>` primitive renders the glass effect in three tiers (Chromium true refraction / non-Chromium blur fallback / reduced-motion static).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest + @testing-library/react, Zustand (lightweight client state for the mock session), deployed on Vercel.

## Global Constraints

- **Node:** ≥ 20.9 (Next.js 16 floor).
- **No backend / no network calls** in Phase 1. All data comes from `MockHabitRepository` (in-memory).
- **Data access only through `HabitRepository`** — no component imports the mock class directly except the single composition-root provider.
- **Glass applied sparingly** — only nav bar, modals, primary CTA, insight cards. Never on list rows or every card (GPU cost).
- **Legibility must never depend on refraction** — Tier 2 fallback is the baseline; text must be readable with only `backdrop-filter: blur()`.
- **Respect `prefers-reduced-motion`** and `prefers-color-scheme`; support explicit light/dark toggle.
- **Typography:** font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif`. Inter loaded via `next/font` as the cross-platform fallback (SF Pro is not shipped).
- **Habit types:** exactly `duration | boolean | count`.
- **Schedule types:** exactly `daily | weekdays | timesPerWeek`.
- **Dates** are handled as `YYYY-MM-DD` local-date strings (no timezones in Phase 1); a single `today()` helper is the only source of "now" so tests can freeze it.
- **Commit after every task** with Conventional Commit messages. Do not `git push` (repo owner controls pushes).

---

## File Structure

```
nitor/
  package.json
  next.config.ts
  tsconfig.json
  vitest.config.ts
  vitest.setup.ts
  postcss.config.mjs
  src/
    app/
      layout.tsx                 # root layout: fonts, ThemeProvider, RepositoryProvider, glass SVG defs
      globals.css                # Tailwind import + glass tokens + base theme
      page.tsx                   # redirects to /today
      today/page.tsx             # Today screen
      habits/page.tsx            # Habits management list
      habits/[id]/page.tsx       # Habit detail + calendar
      insights/page.tsx          # Insights (hero) dashboard
      settings/page.tsx          # Settings
    domain/
      types.ts                   # Habit, Log, Streak, Insight, enums
      dates.ts                   # today(), addDays, eachDayOfMonth, formatting
      streaks.ts                 # computeStreak, computeMomentum (pure)
      insights.ts                # computeInsights (pure): correlations, best-time
    data/
      repository.ts              # HabitRepository interface
      mock/seed.ts               # deterministic seeded habits + multi-week logs
      mock/MockHabitRepository.ts# in-memory implementation
    state/
      RepositoryProvider.tsx     # React context exposing the repository
      useHabits.ts               # hook: load habits/logs, log a value, mutate
      theme.tsx                  # ThemeProvider (light/dark/system + glass intensity)
    components/
      glass/Glass.tsx            # the <Glass> primitive (tiered)
      glass/GlassFilterDefs.tsx  # inline SVG feDisplacementMap filter defs
      glass/useGlassTier.ts      # runtime tier detection hook
      nav/TabBar.tsx             # bottom/side glass nav
      today/HabitCard.tsx        # per-habit card + tap-to-log controls
      today/MomentumBar.tsx      # forgiving momentum indicator
      calendar/MonthCalendar.tsx # color-coded month grid
      insights/InsightCard.tsx   # correlation / best-time card
      insights/StoryCard.tsx     # weekly AI narrative (mock copy)
      habits/HabitForm.tsx       # create/edit form (emoji+color+type+schedule)
      ui/EmojiPicker.tsx         # small emoji picker
      ui/ColorPicker.tsx         # habit color swatches
  tests/
    domain/dates.test.ts
    domain/streaks.test.ts
    domain/insights.test.ts
    data/MockHabitRepository.test.ts
    components/Glass.test.tsx
    components/HabitCard.test.tsx
```

---

## Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `nitor/package.json`, `nitor/next.config.ts`, `nitor/tsconfig.json`, `nitor/postcss.config.mjs`, `nitor/vitest.config.ts`, `nitor/vitest.setup.ts`, `nitor/src/app/layout.tsx`, `nitor/src/app/page.tsx`, `nitor/src/app/globals.css`, `nitor/.gitignore`

**Interfaces:**
- Produces: a running Next.js app with `npm run dev`, `npm run build`, and `npm test` (Vitest) all working.

- [ ] **Step 1: Scaffold the app**

Run from repo root:
```bash
npx create-next-app@latest nitor --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm
```
When prompted for anything not covered by flags, accept defaults.

- [ ] **Step 2: Add test + state dependencies**

```bash
cd nitor
npm install zustand
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `nitor/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `nitor/vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the test script**

In `nitor/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add a trivial smoke test**

Create `nitor/tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Verify build + test**

Run: `npm test`
Expected: 1 passing test.

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 7: Commit**

```bash
cd ..
git add nitor
git commit -m "chore: scaffold Next.js + Tailwind + Vitest for Nitor prototype"
```

---

## Task 2: Domain types

**Files:**
- Create: `nitor/src/domain/types.ts`

**Interfaces:**
- Produces:
  - `type HabitType = "duration" | "boolean" | "count"`
  - `type ScheduleKind = "daily" | "weekdays" | "timesPerWeek"`
  - `interface Schedule { kind: ScheduleKind; weekdays?: number[]; timesPerWeek?: number }`
  - `interface Habit { id: string; name: string; emoji: string; color: string; category: string; type: HabitType; targetValue: number | null; schedule: Schedule; strictness: Strictness; graceDaysPerWeek: number; archived: boolean; createdAt: string }`
  - `type Strictness = "strict" | "balanced" | "flexible"`
  - `interface Log { id: string; habitId: string; date: string; value: number | boolean; note?: string; isGraceDay: boolean; createdAt: string }`
  - `interface Streak { current: number; longest: number; momentum: number }`
  - `type InsightKind = "correlation" | "best_time" | "trend" | "story"`
  - `interface Insight { id: string; habitId?: string; kind: InsightKind; stat: number; label: string; narrative: string }`

- [ ] **Step 1: Write the types file**

Create `nitor/src/domain/types.ts`:
```ts
export type HabitType = "duration" | "boolean" | "count";
export type ScheduleKind = "daily" | "weekdays" | "timesPerWeek";
export type Strictness = "strict" | "balanced" | "flexible";

export interface Schedule {
  kind: ScheduleKind;
  /** 0=Sun..6=Sat; used when kind === "weekdays" */
  weekdays?: number[];
  /** used when kind === "timesPerWeek" */
  timesPerWeek?: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex, e.g. "#7C5CFF"
  category: string;
  type: HabitType;
  /** minutes (duration) or count target; null for boolean */
  targetValue: number | null;
  schedule: Schedule;
  strictness: Strictness;
  graceDaysPerWeek: number;
  archived: boolean;
  createdAt: string; // YYYY-MM-DD
}

export interface Log {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  /** minutes done, count done, or boolean completion */
  value: number | boolean;
  note?: string;
  isGraceDay: boolean;
  createdAt: string; // ISO
}

export interface Streak {
  current: number;
  longest: number;
  /** 0..100 forgiving momentum score */
  momentum: number;
}

export type InsightKind = "correlation" | "best_time" | "trend" | "story";

export interface Insight {
  id: string;
  habitId?: string;
  kind: InsightKind;
  /** the raw computed statistic (correlation coeff, hour, %, etc.) */
  stat: number;
  /** short machine-y label, e.g. "Sleep ↔ Workout" */
  label: string;
  /** human sentence (mocked in Phase 1) */
  narrative: string;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add nitor/src/domain/types.ts
git commit -m "feat: add Nitor domain types"
```

---

## Task 3: Date helpers (TDD)

**Files:**
- Create: `nitor/src/domain/dates.ts`
- Test: `nitor/tests/domain/dates.test.ts`

**Interfaces:**
- Produces:
  - `today(): string` — returns `YYYY-MM-DD` (reads `__NITOR_NOW__` override if set, else real date)
  - `addDays(date: string, n: number): string`
  - `diffDays(a: string, b: string): number` — `a - b` in whole days
  - `weekdayOf(date: string): number` — 0=Sun..6=Sat
  - `eachDayOfMonth(year: number, monthIndex0: number): string[]`

- [ ] **Step 1: Write failing tests**

Create `nitor/tests/domain/dates.test.ts`:
```ts
import { describe, it, expect, afterEach } from "vitest";
import { today, addDays, diffDays, weekdayOf, eachDayOfMonth } from "@/domain/dates";

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__NITOR_NOW__;
});

describe("dates", () => {
  it("today reads the override", () => {
    (globalThis as Record<string, unknown>).__NITOR_NOW__ = "2026-07-13";
    expect(today()).toBe("2026-07-13");
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffDays returns whole-day difference", () => {
    expect(diffDays("2026-07-13", "2026-07-10")).toBe(3);
    expect(diffDays("2026-07-10", "2026-07-13")).toBe(-3);
  });

  it("weekdayOf returns 0..6", () => {
    expect(weekdayOf("2026-07-13")).toBe(1); // Monday
  });

  it("eachDayOfMonth returns all days of the month", () => {
    const days = eachDayOfMonth(2026, 1); // February 2026 (28 days)
    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2026-02-01");
    expect(days[27]).toBe("2026-02-28");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/domain/dates.test.ts`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 3: Implement**

Create `nitor/src/domain/dates.ts`:
```ts
function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  const override = (globalThis as Record<string, unknown>).__NITOR_NOW__;
  if (typeof override === "string") return override;
  const n = new Date();
  return fmt(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
}

export function addDays(date: string, n: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

export function diffDays(a: string, b: string): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / MS);
}

export function weekdayOf(date: string): number {
  return toUTC(date).getUTCDay();
}

export function eachDayOfMonth(year: number, monthIndex0: number): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  while (d.getUTCMonth() === monthIndex0) {
    days.push(fmt(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/domain/dates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add nitor/src/domain/dates.ts nitor/tests/domain/dates.test.ts
git commit -m "feat: add date helpers with frozen-clock support"
```

---

## Task 4: Streak + momentum engine (TDD)

**Files:**
- Create: `nitor/src/domain/streaks.ts`
- Test: `nitor/tests/domain/streaks.test.ts`

**Interfaces:**
- Consumes: `Habit`, `Log` from `@/domain/types`; `today`, `addDays`, `diffDays` from `@/domain/dates`.
- Produces:
  - `isScheduledOn(habit: Habit, date: string): boolean`
  - `isComplete(habit: Habit, log: Log | undefined): boolean` — for duration/count compares against `targetValue`; boolean uses truthiness.
  - `computeStreak(habit: Habit, logs: Log[], asOf?: string): Streak` — current streak counts back over scheduled days, tolerating `isGraceDay` logs; momentum is a 0–100 forgiving score (see below).

**Momentum definition (forgiving, not brittle):** over the last 14 scheduled days, `momentum = round(100 * completedOrGrace / scheduledCount)`, where a missed day contributes 0 but does **not** reset momentum to 0. If no scheduled days in window, momentum = 0.

- [ ] **Step 1: Write failing tests**

Create `nitor/tests/domain/streaks.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isScheduledOn, isComplete, computeStreak } from "@/domain/streaks";
import type { Habit, Log } from "@/domain/types";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "boolean", targetValue: null,
    schedule: { kind: "daily" }, strictness: "balanced",
    graceDaysPerWeek: 1, archived: false, createdAt: "2026-01-01",
    ...over,
  };
}

function log(date: string, value: number | boolean, isGraceDay = false): Log {
  return { id: date, habitId: "h1", date, value, isGraceDay, createdAt: date };
}

describe("isScheduledOn", () => {
  it("daily is always scheduled", () => {
    expect(isScheduledOn(habit(), "2026-07-13")).toBe(true);
  });
  it("weekdays respects the weekday list", () => {
    const h = habit({ schedule: { kind: "weekdays", weekdays: [1, 3, 5] } });
    expect(isScheduledOn(h, "2026-07-13")).toBe(true);  // Monday
    expect(isScheduledOn(h, "2026-07-14")).toBe(false); // Tuesday
  });
});

describe("isComplete", () => {
  it("boolean uses truthiness", () => {
    expect(isComplete(habit(), log("2026-07-13", true))).toBe(true);
    expect(isComplete(habit(), log("2026-07-13", false))).toBe(false);
  });
  it("count compares to target", () => {
    const h = habit({ type: "count", targetValue: 3 });
    expect(isComplete(h, log("2026-07-13", 3))).toBe(true);
    expect(isComplete(h, log("2026-07-13", 2))).toBe(false);
  });
  it("undefined log is incomplete", () => {
    expect(isComplete(habit(), undefined)).toBe(false);
  });
});

describe("computeStreak", () => {
  it("counts consecutive completed scheduled days", () => {
    const logs = [
      log("2026-07-11", true), log("2026-07-12", true), log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(3);
    expect(s.longest).toBeGreaterThanOrEqual(3);
  });

  it("a grace day does not break the current streak", () => {
    const logs = [
      log("2026-07-11", true),
      log("2026-07-12", false, true), // grace day
      log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(3);
  });

  it("a plain miss breaks the current streak but momentum is not zero", () => {
    const logs = [
      log("2026-07-09", true), log("2026-07-10", true),
      // 07-11 missed
      log("2026-07-12", true), log("2026-07-13", true),
    ];
    const s = computeStreak(habit(), logs, "2026-07-13");
    expect(s.current).toBe(2);
    expect(s.momentum).toBeGreaterThan(0);
    expect(s.momentum).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/domain/streaks.test.ts`
Expected: FAIL (functions undefined).

- [ ] **Step 3: Implement**

Create `nitor/src/domain/streaks.ts`:
```ts
import type { Habit, Log, Streak } from "@/domain/types";
import { addDays, diffDays, weekdayOf } from "@/domain/dates";

export function isScheduledOn(habit: Habit, date: string): boolean {
  const s = habit.schedule;
  if (s.kind === "daily") return true;
  if (s.kind === "weekdays") return (s.weekdays ?? []).includes(weekdayOf(date));
  // timesPerWeek: treat every day as an opportunity (flexible)
  return true;
}

export function isComplete(habit: Habit, log: Log | undefined): boolean {
  if (!log) return false;
  if (habit.type === "boolean") return Boolean(log.value);
  const done = typeof log.value === "number" ? log.value : log.value ? 1 : 0;
  return done >= (habit.targetValue ?? 1);
}

function logByDate(logs: Log[]): Map<string, Log> {
  const m = new Map<string, Log>();
  for (const l of logs) m.set(l.date, l);
  return m;
}

export function computeStreak(habit: Habit, logs: Log[], asOf?: string): Streak {
  const byDate = logByDate(logs);
  const end = asOf ?? (logs.length ? logs[logs.length - 1].date : habit.createdAt);

  // Current streak: walk backward over scheduled days.
  let current = 0;
  let cursor = end;
  for (let guard = 0; guard < 3650; guard++) {
    if (diffDays(cursor, habit.createdAt) < 0) break;
    if (isScheduledOn(habit, cursor)) {
      const l = byDate.get(cursor);
      if (isComplete(habit, l) || l?.isGraceDay) current++;
      else break;
    }
    cursor = addDays(cursor, -1);
  }

  // Longest streak: scan all scheduled days from createdAt..end.
  let longest = 0;
  let run = 0;
  for (let d = habit.createdAt; diffDays(end, d) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    const l = byDate.get(d);
    if (isComplete(habit, l) || l?.isGraceDay) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  // Momentum: forgiving 14-scheduled-day fill rate.
  let scheduled = 0;
  let good = 0;
  for (let i = 0; i < 14; i++) {
    const d = addDays(end, -i);
    if (diffDays(d, habit.createdAt) < 0) break;
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    const l = byDate.get(d);
    if (isComplete(habit, l) || l?.isGraceDay) good++;
  }
  const momentum = scheduled === 0 ? 0 : Math.round((100 * good) / scheduled);

  return { current, longest, momentum };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/domain/streaks.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add nitor/src/domain/streaks.ts nitor/tests/domain/streaks.test.ts
git commit -m "feat: add forgiving streak + momentum engine"
```

---

## Task 5: Insight computation (TDD)

**Files:**
- Create: `nitor/src/domain/insights.ts`
- Test: `nitor/tests/domain/insights.test.ts`

**Interfaces:**
- Consumes: `Habit`, `Log`, `Insight` from `@/domain/types`; `isComplete` from `@/domain/streaks`; `weekdayOf` from `@/domain/dates`.
- Produces:
  - `pearson(xs: number[], ys: number[]): number` — Pearson correlation; returns 0 if undefined.
  - `bestCompletionHourBucket(logs: Log[]): number` — hour 0..23 of most completions (uses `createdAt` time); returns -1 if none.
  - `computeInsights(habits: Habit[], logs: Log[]): Insight[]` — returns correlation + best-time + trend cards with **mocked narratives** (deterministic phrasing) when enough data exists (≥ 10 logs), else a single "building baseline" story insight.

- [ ] **Step 1: Write failing tests**

Create `nitor/tests/domain/insights.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pearson, computeInsights } from "@/domain/insights";
import type { Habit, Log } from "@/domain/types";

describe("pearson", () => {
  it("is 1 for perfectly correlated series", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5);
  });
  it("is 0 for constant series", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe("computeInsights", () => {
  const habit: Habit = {
    id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "boolean", targetValue: null, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
  };

  it("returns a baseline story when data is sparse", () => {
    const logs: Log[] = [
      { id: "1", habitId: "h1", date: "2026-06-01", value: true, isGraceDay: false, createdAt: "2026-06-01T08:00:00Z" },
    ];
    const insights = computeInsights([habit], logs);
    expect(insights).toHaveLength(1);
    expect(insights[0].kind).toBe("story");
    expect(insights[0].narrative.toLowerCase()).toContain("baseline");
  });

  it("returns real insight cards when data is rich", () => {
    const logs: Log[] = [];
    for (let i = 0; i < 20; i++) {
      const day = String(i + 1).padStart(2, "0");
      logs.push({
        id: String(i), habitId: "h1", date: `2026-06-${day}`,
        value: i % 2 === 0, isGraceDay: false,
        createdAt: `2026-06-${day}T07:00:00Z`,
      });
    }
    const insights = computeInsights([habit], logs);
    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights.some((i) => i.kind === "best_time")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/domain/insights.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `nitor/src/domain/insights.ts`:
```ts
import type { Habit, Log, Insight } from "@/domain/types";
import { isComplete } from "@/domain/streaks";

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return 0;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function bestCompletionHourBucket(logs: Log[]): number {
  const buckets = new Array(24).fill(0);
  let any = false;
  for (const l of logs) {
    const hour = new Date(l.createdAt).getUTCHours();
    if (!Number.isNaN(hour)) { buckets[hour]++; any = true; }
  }
  if (!any) return -1;
  let best = 0;
  for (let h = 1; h < 24; h++) if (buckets[h] > buckets[best]) best = h;
  return best;
}

const MIN_LOGS = 10;

export function computeInsights(habits: Habit[], logs: Log[]): Insight[] {
  if (logs.length < MIN_LOGS) {
    return [{
      id: "story-baseline",
      kind: "story",
      stat: logs.length,
      label: "Building your baseline",
      narrative:
        "Keep logging for a couple of weeks — Nitor is building your baseline. " +
        "Once there's enough signal, your weekly story and correlations unlock here.",
    }];
  }

  const insights: Insight[] = [];

  const hour = bestCompletionHourBucket(logs);
  if (hour >= 0) {
    const window = `${hour}:00–${(hour + 2) % 24}:00`;
    insights.push({
      id: "best-time",
      kind: "best_time",
      stat: hour,
      label: "Best completion window",
      narrative: `You complete habits most often around ${window}. Protecting that window keeps momentum high.`,
    });
  }

  // Pairwise correlation across the two most-logged habits (mock narrative).
  const byHabit = new Map<string, Log[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push(l);
    byHabit.set(l.habitId, arr);
  }
  const ranked = [...byHabit.entries()].sort((a, b) => b[1].length - a[1].length);
  if (ranked.length >= 2) {
    const [aId] = ranked[0];
    const [bId] = ranked[1];
    const a = habits.find((h) => h.id === aId);
    const b = habits.find((h) => h.id === bId);
    if (a && b) {
      const dates = new Set<string>();
      for (const l of logs) dates.add(l.date);
      const xs: number[] = [], ys: number[] = [];
      const aByDate = new Map(byHabit.get(aId)!.map((l) => [l.date, l]));
      const bByDate = new Map(byHabit.get(bId)!.map((l) => [l.date, l]));
      for (const d of dates) {
        xs.push(isComplete(a, aByDate.get(d)) ? 1 : 0);
        ys.push(isComplete(b, bByDate.get(d)) ? 1 : 0);
      }
      const r = pearson(xs, ys);
      insights.push({
        id: "corr-top2",
        kind: "correlation",
        stat: Number(r.toFixed(2)),
        label: `${a.name} ↔ ${b.name}`,
        narrative:
          r >= 0.2
            ? `On days you do ${a.name}, you're noticeably more likely to do ${b.name}. Stacking them could compound.`
            : `${a.name} and ${b.name} don't move together much yet — they're independent habits for now.`,
      });
    }
  }

  return insights;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/domain/insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add nitor/src/domain/insights.ts nitor/tests/domain/insights.test.ts
git commit -m "feat: add insight computation (correlation, best-time, baseline)"
```

---

## Task 6: Repository interface + seeded mock (TDD)

**Files:**
- Create: `nitor/src/data/repository.ts`, `nitor/src/data/mock/seed.ts`, `nitor/src/data/mock/MockHabitRepository.ts`
- Test: `nitor/tests/data/MockHabitRepository.test.ts`

**Interfaces:**
- Produces:
  - `interface HabitRepository { listHabits(): Promise<Habit[]>; getHabit(id): Promise<Habit | undefined>; listLogs(habitId?): Promise<Log[]>; logValue(input: LogInput): Promise<Log>; upsertHabit(h: Habit): Promise<Habit>; archiveHabit(id): Promise<void> }`
  - `interface LogInput { habitId: string; date: string; value: number | boolean; note?: string; isGraceDay?: boolean }`
  - `createSeededRepository(): HabitRepository` — returns a `MockHabitRepository` preloaded from `seed.ts`.
  - `buildSeed(): { habits: Habit[]; logs: Log[] }` — deterministic data: ~5 habits across categories, ~6 weeks of logs relative to `today()`.

- [ ] **Step 1: Write failing tests**

Create `nitor/tests/data/MockHabitRepository.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import type { HabitRepository } from "@/data/repository";

beforeEach(() => { (globalThis as Record<string, unknown>).__NITOR_NOW__ = "2026-07-13"; });
afterEach(() => { delete (globalThis as Record<string, unknown>).__NITOR_NOW__; });

describe("MockHabitRepository", () => {
  let repo: HabitRepository;
  beforeEach(() => { repo = createSeededRepository(); });

  it("seeds several habits", async () => {
    const habits = await repo.listHabits();
    expect(habits.length).toBeGreaterThanOrEqual(4);
  });

  it("seeds multi-week logs", async () => {
    const logs = await repo.listLogs();
    expect(logs.length).toBeGreaterThan(30);
  });

  it("logValue creates or replaces a log for that habit+date", async () => {
    const [h] = await repo.listHabits();
    await repo.logValue({ habitId: h.id, date: "2026-07-13", value: true });
    const logs = await repo.listLogs(h.id);
    const todays = logs.filter((l) => l.date === "2026-07-13");
    expect(todays).toHaveLength(1);
    expect(todays[0].value).toBe(true);
  });

  it("archiveHabit hides the habit from listHabits", async () => {
    const [h] = await repo.listHabits();
    await repo.archiveHabit(h.id);
    const habits = await repo.listHabits();
    expect(habits.find((x) => x.id === h.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/data/MockHabitRepository.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the interface**

Create `nitor/src/data/repository.ts`:
```ts
import type { Habit, Log } from "@/domain/types";

export interface LogInput {
  habitId: string;
  date: string;
  value: number | boolean;
  note?: string;
  isGraceDay?: boolean;
}

export interface HabitRepository {
  listHabits(): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  listLogs(habitId?: string): Promise<Log[]>;
  logValue(input: LogInput): Promise<Log>;
  upsertHabit(habit: Habit): Promise<Habit>;
  archiveHabit(id: string): Promise<void>;
}
```

- [ ] **Step 4: Implement the seed**

Create `nitor/src/data/mock/seed.ts`:
```ts
import type { Habit, Log } from "@/domain/types";
import { today, addDays, weekdayOf } from "@/domain/dates";

const HABITS: Habit[] = [
  { id: "h_read", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
    type: "duration", targetValue: 20, schedule: { kind: "daily" },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_workout", name: "Workout", emoji: "🏋️", color: "#FF6B6B", category: "Health",
    type: "boolean", targetValue: null, schedule: { kind: "weekdays", weekdays: [1, 3, 5] },
    strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_water", name: "Water", emoji: "💧", color: "#4EA8FF", category: "Health",
    type: "count", targetValue: 8, schedule: { kind: "daily" },
    strictness: "flexible", graceDaysPerWeek: 2, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_meditate", name: "Meditate", emoji: "🧘", color: "#37D39B", category: "Mind",
    type: "duration", targetValue: 10, schedule: { kind: "daily" },
    strictness: "strict", graceDaysPerWeek: 0, archived: false, createdAt: addDays(today(), -42) },
  { id: "h_journal", name: "Journal", emoji: "✍️", color: "#F5A623", category: "Mind",
    type: "boolean", targetValue: null, schedule: { kind: "timesPerWeek", timesPerWeek: 4 },
    strictness: "flexible", graceDaysPerWeek: 2, archived: false, createdAt: addDays(today(), -42) },
];

// Deterministic pseudo-random so seed is stable across reloads.
function seeded(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function completionValue(h: Habit, roll: number): number | boolean {
  if (h.type === "boolean") return roll > 0.25;
  if (h.type === "count") return roll > 0.2 ? (h.targetValue ?? 8) : Math.floor((h.targetValue ?? 8) * roll);
  return roll > 0.2 ? (h.targetValue ?? 20) : Math.floor((h.targetValue ?? 20) * roll);
}

export function buildSeed(): { habits: Habit[]; logs: Log[] } {
  const logs: Log[] = [];
  let counter = 0;
  for (const h of HABITS) {
    for (let i = 42; i >= 0; i--) {
      const date = addDays(today(), -i);
      // respect weekday schedule for the workout habit
      if (h.schedule.kind === "weekdays" && !(h.schedule.weekdays ?? []).includes(weekdayOf(date))) continue;
      const roll = seeded(counter++ + date.length);
      if (roll < 0.12) continue; // a genuine miss
      const isGrace = roll >= 0.12 && roll < 0.16 && h.graceDaysPerWeek > 0;
      const hour = 6 + Math.floor(seeded(counter) * 4); // mornings, for best-time insight
      logs.push({
        id: `${h.id}_${date}`,
        habitId: h.id,
        date,
        value: isGrace ? (h.type === "boolean" ? false : 0) : completionValue(h, roll),
        isGraceDay: isGrace,
        createdAt: `${date}T${String(hour).padStart(2, "0")}:30:00Z`,
      });
    }
  }
  return { habits: HABITS.map((h) => ({ ...h })), logs };
}
```

- [ ] **Step 5: Implement the mock repository**

Create `nitor/src/data/mock/MockHabitRepository.ts`:
```ts
import type { Habit, Log } from "@/domain/types";
import type { HabitRepository, LogInput } from "@/data/repository";
import { buildSeed } from "./seed";

export class MockHabitRepository implements HabitRepository {
  private habits: Habit[];
  private logs: Log[];

  constructor(seed: { habits: Habit[]; logs: Log[] }) {
    this.habits = seed.habits;
    this.logs = seed.logs;
  }

  async listHabits(): Promise<Habit[]> {
    return this.habits.filter((h) => !h.archived).map((h) => ({ ...h }));
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const h = this.habits.find((x) => x.id === id);
    return h ? { ...h } : undefined;
  }

  async listLogs(habitId?: string): Promise<Log[]> {
    const out = habitId ? this.logs.filter((l) => l.habitId === habitId) : this.logs;
    return out.map((l) => ({ ...l }));
  }

  async logValue(input: LogInput): Promise<Log> {
    const idx = this.logs.findIndex((l) => l.habitId === input.habitId && l.date === input.date);
    const log: Log = {
      id: `${input.habitId}_${input.date}`,
      habitId: input.habitId,
      date: input.date,
      value: input.value,
      note: input.note,
      isGraceDay: input.isGraceDay ?? false,
      createdAt: new Date().toISOString(),
    };
    if (idx >= 0) this.logs[idx] = log;
    else this.logs.push(log);
    return { ...log };
  }

  async upsertHabit(habit: Habit): Promise<Habit> {
    const idx = this.habits.findIndex((h) => h.id === habit.id);
    if (idx >= 0) this.habits[idx] = { ...habit };
    else this.habits.push({ ...habit });
    return { ...habit };
  }

  async archiveHabit(id: string): Promise<void> {
    const h = this.habits.find((x) => x.id === id);
    if (h) h.archived = true;
  }
}

export function createSeededRepository(): HabitRepository {
  return new MockHabitRepository(buildSeed());
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run tests/data/MockHabitRepository.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add nitor/src/data nitor/tests/data
git commit -m "feat: add HabitRepository interface + seeded mock repository"
```

---

## Task 7: Design tokens, theme, and Inter font

**Files:**
- Modify: `nitor/src/app/globals.css`
- Create: `nitor/src/state/theme.tsx`
- Modify: `nitor/src/app/layout.tsx`

**Interfaces:**
- Produces:
  - CSS custom properties for glass + palette on `:root` and `[data-theme="dark"]`.
  - `ThemeProvider` + `useTheme(): { theme: "light" | "dark"; glass: number; setTheme; setGlass }` (persisted to `localStorage`, default follows `prefers-color-scheme`).

- [ ] **Step 1: Write the tokens + base styles**

Replace `nitor/src/app/globals.css` with:
```css
@import "tailwindcss";

:root {
  --bg: 250 250 252;
  --surface: 255 255 255;
  --text: 17 17 20;
  --muted: 110 110 120;
  --accent: 124 92 255;

  --glass-blur: 18px;
  --glass-saturate: 180%;
  --glass-tint: 255 255 255;
  --glass-tint-opacity: 0.55;
  --glass-border: 255 255 255;
  --glass-border-opacity: 0.6;
  --glass-specular-opacity: 0.35;
  --glass-displace: 40; /* px scale for Tier 1 refraction */
}

[data-theme="dark"] {
  --bg: 12 12 16;
  --surface: 22 22 28;
  --text: 240 240 245;
  --muted: 150 150 160;
  --accent: 140 112 255;

  --glass-tint: 30 30 40;
  --glass-tint-opacity: 0.45;
  --glass-border: 255 255 255;
  --glass-border-opacity: 0.14;
  --glass-specular-opacity: 0.22;
}

html, body {
  background: rgb(var(--bg));
  color: rgb(var(--text));
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Ambient gradient wash so glass has something colorful to refract. */
body::before {
  content: "";
  position: fixed;
  inset: -20%;
  z-index: -1;
  background:
    radial-gradient(40% 40% at 20% 20%, rgba(124,92,255,0.30), transparent 70%),
    radial-gradient(40% 40% at 80% 30%, rgba(78,168,255,0.28), transparent 70%),
    radial-gradient(50% 50% at 60% 90%, rgba(55,211,155,0.22), transparent 70%);
  filter: blur(20px);
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 2: Write the ThemeProvider**

Create `nitor/src/state/theme.tsx`:
```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  glass: number; // 0..1 intensity
  setTheme: (t: Theme) => void;
  setGlass: (g: number) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [glass, setGlass] = useState<number>(1);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nitor.theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme ?? (prefersDark ? "dark" : "light"));
    const savedGlass = localStorage.getItem("nitor.glass");
    if (savedGlass) setGlass(Number(savedGlass));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nitor.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--glass-tint-opacity", String(0.3 + glass * 0.3));
    localStorage.setItem("nitor.glass", String(glass));
  }, [glass]);

  return <Ctx.Provider value={{ theme, glass, setTheme, setGlass }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
```

- [ ] **Step 3: Wire fonts + providers in the root layout**

Replace `nitor/src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/state/theme";
import { RepositoryProvider } from "@/state/RepositoryProvider";
import { GlassFilterDefs } from "@/components/glass/GlassFilterDefs";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Nitor — habits that tell you why",
  description: "A habit tracker with a forgiving streak and insights that explain your success.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          <RepositoryProvider>
            <GlassFilterDefs />
            {children}
          </RepositoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

> Note: `RepositoryProvider` and `GlassFilterDefs` are created in Tasks 8 and 9. If executing strictly in order, temporarily comment those two imports/usages until those tasks land, then uncomment. (Subagent-driven execution should implement Tasks 8–9 before running the app.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds (after Tasks 8–9 land) or type-only pass with imports stubbed.

- [ ] **Step 5: Commit**

```bash
git add nitor/src/app/globals.css nitor/src/state/theme.tsx nitor/src/app/layout.tsx
git commit -m "feat: add glass design tokens, theme provider, and fonts"
```

---

## Task 8: Repository provider + data hook

**Files:**
- Create: `nitor/src/state/RepositoryProvider.tsx`, `nitor/src/state/useHabits.ts`

**Interfaces:**
- Consumes: `createSeededRepository`, `HabitRepository`, `Habit`, `Log`, `LogInput`.
- Produces:
  - `RepositoryProvider` (composition root — the ONLY place that constructs the mock repo).
  - `useRepository(): HabitRepository`
  - `useHabits(): { habits: Habit[]; logs: Log[]; loading: boolean; log: (input: LogInput) => Promise<void>; refresh: () => Promise<void> }`

- [ ] **Step 1: Write the provider**

Create `nitor/src/state/RepositoryProvider.tsx`:
```tsx
"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import type { HabitRepository } from "@/data/repository";

const Ctx = createContext<HabitRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HabitRepository | null>(null);
  if (!ref.current) ref.current = createSeededRepository();
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useRepository(): HabitRepository {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRepository must be used within RepositoryProvider");
  return c;
}
```

- [ ] **Step 2: Write the data hook**

Create `nitor/src/state/useHabits.ts`:
```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRepository } from "./RepositoryProvider";
import type { Habit, Log } from "@/domain/types";
import type { LogInput } from "@/data/repository";

export function useHabits() {
  const repo = useRepository();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [h, l] = await Promise.all([repo.listHabits(), repo.listLogs()]);
    setHabits(h);
    setLogs(l);
    setLoading(false);
  }, [repo]);

  useEffect(() => { void refresh(); }, [refresh]);

  const log = useCallback(async (input: LogInput) => {
    await repo.logValue(input);
    await refresh();
  }, [repo, refresh]);

  return { habits, logs, loading, log, refresh };
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add nitor/src/state/RepositoryProvider.tsx nitor/src/state/useHabits.ts
git commit -m "feat: add repository provider and useHabits hook"
```

---

## Task 9: The `<Glass>` primitive + tiered rendering (TDD for tier logic)

**Files:**
- Create: `nitor/src/components/glass/useGlassTier.ts`, `nitor/src/components/glass/GlassFilterDefs.tsx`, `nitor/src/components/glass/Glass.tsx`
- Test: `nitor/tests/components/Glass.test.tsx`

**Interfaces:**
- Produces:
  - `detectGlassTier(opts): 1 | 2 | 3` — pure function: returns 3 if reduced-motion, 1 if Chromium-with-SVG-backdrop support, else 2.
  - `useGlassTier(): 1 | 2 | 3` — client hook wrapping detection (SSR-safe: returns 2 until mounted).
  - `<GlassFilterDefs />` — renders the inline SVG `feDisplacementMap` filter once at app root (id `nitor-liquid`).
  - `<Glass as? className? interactive? children>` — element wrapped in the correct tier styling.

- [ ] **Step 1: Write failing test for tier detection**

Create `nitor/tests/components/Glass.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { detectGlassTier } from "@/components/glass/useGlassTier";

describe("detectGlassTier", () => {
  it("returns 3 when reduced motion is requested", () => {
    expect(detectGlassTier({ reducedMotion: true, chromiumSvgBackdrop: true })).toBe(3);
  });
  it("returns 1 for Chromium with SVG backdrop support", () => {
    expect(detectGlassTier({ reducedMotion: false, chromiumSvgBackdrop: true })).toBe(1);
  });
  it("returns 2 otherwise (Safari/Firefox fallback)", () => {
    expect(detectGlassTier({ reducedMotion: false, chromiumSvgBackdrop: false })).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/components/Glass.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement tier detection**

Create `nitor/src/components/glass/useGlassTier.ts`:
```ts
"use client";
import { useEffect, useState } from "react";

export interface TierInputs { reducedMotion: boolean; chromiumSvgBackdrop: boolean; }

export function detectGlassTier(i: TierInputs): 1 | 2 | 3 {
  if (i.reducedMotion) return 3;
  if (i.chromiumSvgBackdrop) return 1;
  return 2;
}

function supportsSvgBackdrop(): boolean {
  // Chromium supports url() SVG filters in backdrop-filter; Safari/Firefox do not.
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg/.test(ua) && !/OPR|SamsungBrowser/.test(ua);
  const supported =
    CSS.supports("backdrop-filter", "url(#x)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#x)");
  return isChromium && supported;
}

export function useGlassTier(): 1 | 2 | 3 {
  const [tier, setTier] = useState<1 | 2 | 3>(2); // SSR-safe default
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTier(detectGlassTier({ reducedMotion: reduced, chromiumSvgBackdrop: supportsSvgBackdrop() }));
  }, []);
  return tier;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/components/Glass.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the SVG filter defs**

Create `nitor/src/components/glass/GlassFilterDefs.tsx`:
```tsx
"use client";
/**
 * Renders the Tier-1 liquid refraction filter once. A radial displacement map
 * (encoded as a data-URI gradient) warps the backdrop near the element edges.
 */
export function GlassFilterDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="nitor-disp-grad">
          <stop offset="0%" stopColor="#808080" />
          <stop offset="75%" stopColor="#808080" />
          <stop offset="100%" stopColor="#ffffff" />
        </radialGradient>
        <filter id="nitor-liquid" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feImage
            href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><radialGradient id='g' cx='50%25' cy='50%25' r='50%25'><stop offset='60%25' stop-color='rgb(128,128,128)'/><stop offset='100%25' stop-color='rgb(200,140,128)'/></radialGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>"
            result="map"
            preserveAspectRatio="none"
            x="0" y="0" width="100%" height="100%"
          />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
```

- [ ] **Step 6: Implement the Glass component**

Create `nitor/src/components/glass/Glass.tsx`:
```tsx
"use client";
import { type ElementType, type ReactNode } from "react";
import { useGlassTier } from "./useGlassTier";

interface GlassProps {
  as?: ElementType;
  className?: string;
  interactive?: boolean;
  children?: ReactNode;
}

export function Glass({ as, className = "", interactive = false, children }: GlassProps) {
  const Tag = (as ?? "div") as ElementType;
  const tier = useGlassTier();

  const base =
    "relative rounded-3xl border overflow-hidden " +
    "[border-color:rgb(var(--glass-border)/var(--glass-border-opacity))] " +
    "[background:rgb(var(--glass-tint)/var(--glass-tint-opacity))] " +
    (interactive ? "transition-transform duration-300 will-change-transform active:scale-[0.98] " : "");

  const tierStyle: Record<1 | 2 | 3, React.CSSProperties> = {
    1: {
      backdropFilter: "url(#nitor-liquid) blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
    },
    2: {
      backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
    },
    3: {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
  };

  return (
    <Tag className={`${base} ${className}`} style={tierStyle[tier]} data-glass-tier={tier}>
      {/* specular highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(135deg, rgb(255 255 255 / var(--glass-specular-opacity)) 0%, transparent 40%, transparent 60%, rgb(255 255 255 / calc(var(--glass-specular-opacity) * 0.5)) 100%)",
        }}
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 8: Commit**

```bash
git add nitor/src/components/glass nitor/tests/components/Glass.test.tsx
git commit -m "feat: add tiered Liquid Glass primitive with SVG refraction"
```

---

## Task 10: App shell + glass tab bar + routing

**Files:**
- Create: `nitor/src/components/nav/TabBar.tsx`
- Modify: `nitor/src/app/page.tsx`
- Create: `nitor/src/app/today/page.tsx` (placeholder), `nitor/src/app/insights/page.tsx` (placeholder), `nitor/src/app/habits/page.tsx` (placeholder), `nitor/src/app/settings/page.tsx` (placeholder)

**Interfaces:**
- Consumes: `Glass`.
- Produces: `<TabBar />` fixed glass navigation with links to `/today`, `/insights`, `/habits`, `/settings`, highlighting the active route via `usePathname`.

- [ ] **Step 1: Redirect root to /today**

Replace `nitor/src/app/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/today"); }
```

- [ ] **Step 2: Create the TabBar**

Create `nitor/src/components/nav/TabBar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glass } from "@/components/glass/Glass";

const TABS = [
  { href: "/today", label: "Today", icon: "◎" },
  { href: "/insights", label: "Insights", icon: "✦" },
  { href: "/habits", label: "Habits", icon: "☰" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <Glass className="px-2 py-2">
        <ul className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={
                    "flex flex-col items-center rounded-2xl px-4 py-2 text-xs transition-colors " +
                    (active ? "[color:rgb(var(--accent))]" : "[color:rgb(var(--muted))]")
                  }
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="mt-1">{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Glass>
    </nav>
  );
}
```

- [ ] **Step 3: Create placeholder pages that render the shell**

Create each of `nitor/src/app/today/page.tsx`, `nitor/src/app/insights/page.tsx`, `nitor/src/app/habits/page.tsx`, `nitor/src/app/settings/page.tsx` with this pattern (change the heading per page):
```tsx
import { TabBar } from "@/components/nav/TabBar";

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      <TabBar />
    </main>
  );
}
```
(Use "Insights", "Habits", "Settings" as the heading in the respective files.)

- [ ] **Step 4: Verify the app runs**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: redirects to `/today`, glass tab bar floats at the bottom, tapping tabs navigates and highlights the active one.

- [ ] **Step 5: Commit**

```bash
git add nitor/src/app nitor/src/components/nav
git commit -m "feat: add app shell with floating glass tab bar and routes"
```

---

## Task 11: Today screen — habit cards, tap-to-log, momentum (component test)

**Files:**
- Create: `nitor/src/components/today/MomentumBar.tsx`, `nitor/src/components/today/HabitCard.tsx`
- Modify: `nitor/src/app/today/page.tsx`
- Test: `nitor/tests/components/HabitCard.test.tsx`

**Interfaces:**
- Consumes: `Habit`, `Log`, `computeStreak`, `isComplete`, `today`, `useHabits`, `Glass`.
- Produces:
  - `<MomentumBar value={number} color={string} />`
  - `<HabitCard habit logs onLog />` where `onLog(value: number | boolean) => void`.

- [ ] **Step 1: Write failing component test**

Create `nitor/tests/components/HabitCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitCard } from "@/components/today/HabitCard";
import type { Habit } from "@/domain/types";

const habit: Habit = {
  id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
  type: "boolean", targetValue: null, schedule: { kind: "daily" },
  strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
};

describe("HabitCard", () => {
  it("renders the habit name and emoji", () => {
    render(<HabitCard habit={habit} logs={[]} onLog={() => {}} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("📖")).toBeInTheDocument();
  });

  it("calls onLog(true) when a boolean habit is tapped", () => {
    const onLog = vi.fn();
    render(<HabitCard habit={habit} logs={[]} onLog={onLog} />);
    fireEvent.click(screen.getByRole("button", { name: /mark read/i }));
    expect(onLog).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/components/HabitCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement MomentumBar**

Create `nitor/src/components/today/MomentumBar.tsx`:
```tsx
export function MomentumBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full [background:rgb(var(--muted)/0.2)]">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(4, value)}%`, background: color }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement HabitCard**

Create `nitor/src/components/today/HabitCard.tsx`:
```tsx
"use client";
import type { Habit, Log } from "@/domain/types";
import { computeStreak, isComplete } from "@/domain/streaks";
import { today } from "@/domain/dates";
import { MomentumBar } from "./MomentumBar";

export function HabitCard({
  habit, logs, onLog,
}: { habit: Habit; logs: Log[]; onLog: (value: number | boolean) => void }) {
  const streak = computeStreak(habit, logs, today());
  const todayLog = logs.find((l) => l.date === today());
  const done = isComplete(habit, todayLog);
  const count = typeof todayLog?.value === "number" ? todayLog.value : 0;

  return (
    <div className="rounded-3xl border [border-color:rgb(var(--muted)/0.15)] [background:rgb(var(--surface))] p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>{habit.emoji}</span>
        <div className="flex-1">
          <div className="font-medium">{habit.name}</div>
          <div className="text-xs [color:rgb(var(--muted))]">
            🔥 {streak.current} · best {streak.longest}
          </div>
        </div>

        {habit.type === "boolean" && (
          <button
            aria-label={`Mark ${habit.name} ${done ? "not done" : "done"}`}
            onClick={() => onLog(!done)}
            className={
              "grid h-11 w-11 place-items-center rounded-full text-lg transition-transform active:scale-90 " +
              (done ? "text-white" : "[color:rgb(var(--muted))] [background:rgb(var(--muted)/0.12)]")
            }
            style={done ? { background: habit.color } : undefined}
          >
            ✓
          </button>
        )}

        {habit.type === "count" && (
          <div className="flex items-center gap-2">
            <button
              aria-label={`Decrease ${habit.name}`}
              onClick={() => onLog(Math.max(0, count - 1))}
              className="h-9 w-9 rounded-full [background:rgb(var(--muted)/0.12)]"
            >−</button>
            <span className="w-10 text-center tabular-nums">{count}/{habit.targetValue}</span>
            <button
              aria-label={`Increase ${habit.name}`}
              onClick={() => onLog(count + 1)}
              className="h-9 w-9 rounded-full text-white"
              style={{ background: habit.color }}
            >+</button>
          </div>
        )}

        {habit.type === "duration" && (
          <button
            aria-label={`Mark ${habit.name} done`}
            onClick={() => onLog(habit.targetValue ?? 1)}
            className={
              "rounded-full px-4 py-2 text-sm transition-transform active:scale-95 " +
              (done ? "text-white" : "[color:rgb(var(--muted))] [background:rgb(var(--muted)/0.12)]")
            }
            style={done ? { background: habit.color } : undefined}
          >
            {done ? "Done" : `${habit.targetValue}m`}
          </button>
        )}
      </div>
      <div className="mt-3"><MomentumBar value={streak.momentum} color={habit.color} /></div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/components/HabitCard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the Today page**

Replace `nitor/src/app/today/page.tsx` with:
```tsx
"use client";
import { TabBar } from "@/components/nav/TabBar";
import { HabitCard } from "@/components/today/HabitCard";
import { useHabits } from "@/state/useHabits";
import { today } from "@/domain/dates";

export default function TodayPage() {
  const { habits, logs, loading, log } = useHabits();
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-sm [color:rgb(var(--muted))]">{today()}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      </header>
      {loading ? (
        <p className="[color:rgb(var(--muted))]">Loading…</p>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              logs={logs.filter((l) => l.habitId === h.id)}
              onLog={(value) => log({ habitId: h.id, date: today(), value })}
            />
          ))}
        </div>
      )}
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`. On `/today`, tapping a boolean habit fills it with its color; count +/- updates the number; the momentum bar reflects history.

- [ ] **Step 8: Commit**

```bash
git add nitor/src/components/today nitor/src/app/today nitor/tests/components/HabitCard.test.tsx
git commit -m "feat: add Today screen with tap-to-log habit cards and momentum"
```

---

## Task 12: Habit detail + month calendar

**Files:**
- Create: `nitor/src/components/calendar/MonthCalendar.tsx`, `nitor/src/app/habits/[id]/page.tsx`

**Interfaces:**
- Consumes: `Habit`, `Log`, `eachDayOfMonth`, `weekdayOf`, `today`, `isScheduledOn`, `isComplete`, `computeStreak`, `useRepository`.
- Produces: `<MonthCalendar habit logs year monthIndex0 />` rendering a 7-column grid; each scheduled day colored: complete = habit color, grace = amber ring, missed = muted red dot, not-scheduled = faint.

- [ ] **Step 1: Implement MonthCalendar**

Create `nitor/src/components/calendar/MonthCalendar.tsx`:
```tsx
import type { Habit, Log } from "@/domain/types";
import { eachDayOfMonth, weekdayOf } from "@/domain/dates";
import { isScheduledOn, isComplete } from "@/domain/streaks";

export function MonthCalendar({
  habit, logs, year, monthIndex0,
}: { habit: Habit; logs: Log[]; year: number; monthIndex0: number }) {
  const days = eachDayOfMonth(year, monthIndex0);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const pad = weekdayOf(days[0]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
        <div key={i} className="text-center text-xs [color:rgb(var(--muted))]">{d}</div>
      ))}
      {Array.from({ length: pad }).map((_, i) => <div key={`pad${i}`} />)}
      {days.map((date) => {
        const scheduled = isScheduledOn(habit, date);
        const l = byDate.get(date);
        const complete = isComplete(habit, l);
        const grace = l?.isGraceDay;
        const dayNum = Number(date.slice(-2));
        let style: React.CSSProperties = {};
        let cls = "grid aspect-square place-items-center rounded-xl text-xs ";
        if (!scheduled) cls += "[color:rgb(var(--muted)/0.4)] [background:rgb(var(--muted)/0.05)]";
        else if (complete) { style = { background: habit.color, color: "white" }; }
        else if (grace) cls += "[color:rgb(var(--text))] ring-2 ring-amber-400/70";
        else cls += "[color:rgb(var(--muted))] [background:rgb(244_99_99/0.12)]";
        return <div key={date} className={cls} style={style}>{dayNum}</div>;
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implement the detail page**

Create `nitor/src/app/habits/[id]/page.tsx`:
```tsx
"use client";
import { use, useEffect, useState } from "react";
import { TabBar } from "@/components/nav/TabBar";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { useRepository } from "@/state/RepositoryProvider";
import { computeStreak } from "@/domain/streaks";
import { today } from "@/domain/dates";
import type { Habit, Log } from "@/domain/types";

export default function HabitDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repo = useRepository();
  const [habit, setHabit] = useState<Habit | undefined>();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    void (async () => {
      setHabit(await repo.getHabit(id));
      setLogs(await repo.listLogs(id));
    })();
  }, [repo, id]);

  if (!habit) return <main className="p-8">Loading…</main>;
  const streak = computeStreak(habit, logs, today());
  const now = today();
  const [y, m] = now.split("-").map(Number);

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="text-3xl">{habit.emoji}</span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
          <p className="text-sm [color:rgb(var(--muted))]">🔥 {streak.current} · best {streak.longest} · momentum {streak.momentum}</p>
        </div>
      </header>
      <MonthCalendar habit={habit} logs={logs} year={y} monthIndex0={m - 1} />
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 3: Link habit list rows to detail**

(Handled in Task 13's Habits list — each row links to `/habits/[id]`.)

- [ ] **Step 4: Verify in browser**

Navigate to `/habits/h_read`. Expected: calendar shows ~6 weeks of colored history, grace days ringed amber, misses tinted red.

- [ ] **Step 5: Commit**

```bash
git add nitor/src/components/calendar nitor/src/app/habits/[id]
git commit -m "feat: add habit detail with color-coded month calendar"
```

---

## Task 13: Habits management (list + create/edit/archive)

**Files:**
- Create: `nitor/src/components/ui/EmojiPicker.tsx`, `nitor/src/components/ui/ColorPicker.tsx`, `nitor/src/components/habits/HabitForm.tsx`
- Modify: `nitor/src/app/habits/page.tsx`

**Interfaces:**
- Consumes: `Habit`, `useHabits`, `useRepository`, `today`, `Glass`.
- Produces: Habits list (rows link to detail), an "Add habit" flow using `<HabitForm onSubmit={(habit) => ...}/>`, archive action.

- [ ] **Step 1: Implement EmojiPicker**

Create `nitor/src/components/ui/EmojiPicker.tsx`:
```tsx
"use client";
const EMOJIS = ["📖","🏋️","💧","🧘","✍️","🏃","🥗","😴","🎯","🎸","🧹","☎️","💊","🌱","📵"];
export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onChange(e)}
          className={"grid h-10 w-10 place-items-center rounded-xl text-lg " + (value === e ? "ring-2 ring-[rgb(var(--accent))]" : "[background:rgb(var(--muted)/0.1)]")}>
          {e}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement ColorPicker**

Create `nitor/src/components/ui/ColorPicker.tsx`:
```tsx
"use client";
const COLORS = ["#7C5CFF","#FF6B6B","#4EA8FF","#37D39B","#F5A623","#FF8FB1","#00C2C7","#B084FF"];
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={`color ${c}`}
          className={"h-9 w-9 rounded-full " + (value === c ? "ring-2 ring-offset-2 ring-[rgb(var(--text))]" : "")}
          style={{ background: c }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement HabitForm**

Create `nitor/src/components/habits/HabitForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Habit, HabitType } from "@/domain/types";
import { today } from "@/domain/dates";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";

export function HabitForm({ onSubmit }: { onSubmit: (habit: Habit) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState("#7C5CFF");
  const [type, setType] = useState<HabitType>("boolean");
  const [target, setTarget] = useState(1);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          id: `h_${Date.now()}`, name: name || "New habit", emoji, color,
          category: "Personal", type, targetValue: type === "boolean" ? null : target,
          schedule: { kind: "daily" }, strictness: "balanced", graceDaysPerWeek: 1,
          archived: false, createdAt: today(),
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name"
        className="w-full rounded-2xl px-4 py-3 [background:rgb(var(--muted)/0.1)] outline-none" />
      <div><p className="mb-2 text-sm [color:rgb(var(--muted))]">Emoji</p><EmojiPicker value={emoji} onChange={setEmoji} /></div>
      <div><p className="mb-2 text-sm [color:rgb(var(--muted))]">Color</p><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex gap-2">
        {(["boolean","count","duration"] as HabitType[]).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={"flex-1 rounded-2xl py-2 text-sm capitalize " + (type === t ? "text-white [background:rgb(var(--accent))]" : "[background:rgb(var(--muted)/0.1)]")}>
            {t}
          </button>
        ))}
      </div>
      {type !== "boolean" && (
        <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))}
          className="w-full rounded-2xl px-4 py-3 [background:rgb(var(--muted)/0.1)] outline-none"
          placeholder={type === "duration" ? "Target minutes" : "Target count"} />
      )}
      <button type="submit" className="w-full rounded-2xl py-3 text-white [background:rgb(var(--accent))]">Add habit</button>
    </form>
  );
}
```

- [ ] **Step 4: Wire the Habits page**

Replace `nitor/src/app/habits/page.tsx` with:
```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { TabBar } from "@/components/nav/TabBar";
import { HabitForm } from "@/components/habits/HabitForm";
import { useHabits } from "@/state/useHabits";
import { useRepository } from "@/state/RepositoryProvider";
import type { Habit } from "@/domain/types";

export default function HabitsPage() {
  const { habits, refresh } = useHabits();
  const repo = useRepository();
  const [adding, setAdding] = useState(false);

  async function addHabit(h: Habit) {
    await repo.upsertHabit(h);
    setAdding(false);
    await refresh();
  }
  async function archive(id: string) {
    await repo.archiveHabit(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Habits</h1>
        <button onClick={() => setAdding((v) => !v)} className="rounded-full px-4 py-2 text-sm text-white [background:rgb(var(--accent))]">
          {adding ? "Close" : "+ Add"}
        </button>
      </div>
      {adding && <div className="mb-6 rounded-3xl border [border-color:rgb(var(--muted)/0.15)] p-4"><HabitForm onSubmit={addHabit} /></div>}
      <ul className="space-y-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center gap-3 rounded-2xl border [border-color:rgb(var(--muted)/0.12)] p-3">
            <span className="text-xl">{h.emoji}</span>
            <Link href={`/habits/${h.id}`} className="flex-1 font-medium">{h.name}</Link>
            <span className="text-xs capitalize [color:rgb(var(--muted))]">{h.type}</span>
            <button onClick={() => archive(h.id)} aria-label={`Archive ${h.name}`} className="text-sm [color:rgb(var(--muted))]">Archive</button>
          </li>
        ))}
      </ul>
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 5: Verify in browser**

Add a habit → appears in list and on Today. Archive → disappears from both. Row → opens detail.

- [ ] **Step 6: Commit**

```bash
git add nitor/src/components/ui nitor/src/components/habits nitor/src/app/habits/page.tsx
git commit -m "feat: add habits management with create/edit/archive"
```

---

## Task 14: Insights screen (the hero)

**Files:**
- Create: `nitor/src/components/insights/InsightCard.tsx`, `nitor/src/components/insights/StoryCard.tsx`
- Modify: `nitor/src/app/insights/page.tsx`

**Interfaces:**
- Consumes: `computeInsights`, `useHabits`, `Insight`, `Glass`.
- Produces: `<StoryCard insight />` (glass, prominent) and `<InsightCard insight />` (correlation / best-time).

- [ ] **Step 1: Implement StoryCard (glass hero)**

Create `nitor/src/components/insights/StoryCard.tsx`:
```tsx
import type { Insight } from "@/domain/types";
import { Glass } from "@/components/glass/Glass";

export function StoryCard({ insight }: { insight: Insight }) {
  return (
    <Glass className="p-6">
      <p className="mb-2 text-xs uppercase tracking-widest [color:rgb(var(--accent))]">This week</p>
      <p className="text-lg font-medium leading-snug">{insight.narrative}</p>
    </Glass>
  );
}
```

- [ ] **Step 2: Implement InsightCard**

Create `nitor/src/components/insights/InsightCard.tsx`:
```tsx
import type { Insight } from "@/domain/types";

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-3xl border [border-color:rgb(var(--muted)/0.15)] [background:rgb(var(--surface))] p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{insight.label}</span>
        <span className="tabular-nums text-sm [color:rgb(var(--accent))]">
          {insight.kind === "correlation" ? `r=${insight.stat}` : insight.kind === "best_time" ? `${insight.stat}:00` : insight.stat}
        </span>
      </div>
      <p className="mt-2 text-sm [color:rgb(var(--muted))]">{insight.narrative}</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire the Insights page**

Replace `nitor/src/app/insights/page.tsx` with:
```tsx
"use client";
import { TabBar } from "@/components/nav/TabBar";
import { StoryCard } from "@/components/insights/StoryCard";
import { InsightCard } from "@/components/insights/InsightCard";
import { useHabits } from "@/state/useHabits";
import { computeInsights } from "@/domain/insights";

export default function InsightsPage() {
  const { habits, logs, loading } = useHabits();
  const insights = computeInsights(habits, logs);
  const story = insights.find((i) => i.kind === "story");
  const cards = insights.filter((i) => i.kind !== "story");

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm [color:rgb(var(--muted))]">Why you succeed — not just whether.</p>
      </header>
      {loading ? <p className="[color:rgb(var(--muted))]">Loading…</p> : (
        <div className="space-y-4">
          {story && <StoryCard insight={story} />}
          {cards.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 4: Verify in browser**

On `/insights`: with seeded data (>10 logs) you see the glass story card + best-time + correlation cards. (Temporarily archiving down to sparse data shows the "building your baseline" story.)

- [ ] **Step 5: Commit**

```bash
git add nitor/src/components/insights nitor/src/app/insights/page.tsx
git commit -m "feat: add Insights hero screen with glass story + insight cards"
```

---

## Task 15: Settings — theme + glass intensity + export affordance

**Files:**
- Modify: `nitor/src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useHabits`, `Glass`.
- Produces: theme toggle, glass-intensity slider (`setGlass`), and an "Export data" button that downloads the mock logs as JSON.

- [ ] **Step 1: Wire the Settings page**

Replace `nitor/src/app/settings/page.tsx` with:
```tsx
"use client";
import { TabBar } from "@/components/nav/TabBar";
import { useTheme } from "@/state/theme";
import { useHabits } from "@/state/useHabits";

export default function SettingsPage() {
  const { theme, setTheme, glass, setGlass } = useTheme();
  const { habits, logs } = useHabits();

  function exportData() {
    const blob = new Blob([JSON.stringify({ habits, logs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nitor-export.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Settings</h1>
      <section className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border [border-color:rgb(var(--muted)/0.15)] p-4">
          <span>Appearance</span>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full px-4 py-2 text-sm [background:rgb(var(--muted)/0.12)]">
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
        <div className="rounded-2xl border [border-color:rgb(var(--muted)/0.15)] p-4">
          <div className="mb-2 flex items-center justify-between"><span>Glass intensity</span><span className="text-sm [color:rgb(var(--muted))]">{Math.round(glass * 100)}%</span></div>
          <input type="range" min={0} max={1} step={0.05} value={glass} onChange={(e) => setGlass(Number(e.target.value))} className="w-full" />
        </div>
        <button onClick={exportData} className="w-full rounded-2xl py-3 text-white [background:rgb(var(--accent))]">Export my data (JSON)</button>
      </section>
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

Toggle theme (whole app recolors), drag glass slider (glass tint changes live), export downloads a JSON file.

- [ ] **Step 3: Commit**

```bash
git add nitor/src/app/settings/page.tsx
git commit -m "feat: add settings with theme, glass intensity, and data export"
```

---

## Task 16: Full verification + Vercel deploy prep

**Files:**
- Create: `nitor/README.md`

**Interfaces:**
- Produces: a green test suite, a clean production build, and deploy instructions.

- [ ] **Step 1: Run the full test suite**

Run: `cd nitor && npm test`
Expected: all tests pass (dates, streaks, insights, mock repo, glass tier, habit card).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: compiles with no type or lint errors.

- [ ] **Step 3: Manual smoke pass (reduced-motion + dark)**

In the browser: verify `/today`, `/insights`, `/habits`, `/habits/h_read`, `/settings` all render and are interactive; toggle OS reduced-motion and confirm glass falls back to Tier 3 (static frosted) without breaking legibility; toggle dark mode.

- [ ] **Step 4: Write README with deploy steps**

Create `nitor/README.md`:
```markdown
# Nitor — Phase 1 (Liquid Glass prototype)

A clickable habit-tracker front end on mock data. No backend/auth yet.

## Develop
    cd nitor
    npm install
    npm run dev      # http://localhost:3000
    npm test         # unit + component tests
    npm run build    # production build

## Deploy (Vercel)
1. Push this repo to GitHub (owner controls when).
2. In Vercel, "New Project" → import the repo → set Root Directory to `nitor`.
3. Framework preset: Next.js. No env vars needed for Phase 1.
4. Deploy. Preview URL is the shareable demo.

## Architecture notes
- All data is behind `HabitRepository` (`src/data/repository.ts`). Phase 2 swaps
  `MockHabitRepository` for a Supabase implementation with no UI changes.
- The Liquid Glass effect (`src/components/glass/Glass.tsx`) renders in three tiers:
  Chromium true SVG refraction, non-Chromium blur fallback, reduced-motion static.
```

- [ ] **Step 5: Commit**

```bash
git add nitor/README.md
git commit -m "docs: add Nitor prototype README and deploy steps"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Screens (Today/Detail/Insights/Habits/Settings) → Tasks 11–15. Liquid Glass tiers → Task 9. Phase-2-ready data layer → Tasks 6, 8. Forgiving streaks → Task 4. Insights hybrid (stats now, narrative mocked) → Tasks 5, 14. Light/dark + glass intensity → Tasks 7, 15. Export → Task 15. Deploy → Task 16.
- **Ordering caveat:** Task 7's root layout imports `RepositoryProvider` (Task 8) and `GlassFilterDefs` (Task 9). Implement Tasks 8–9 before running `npm run dev`, or stub those two imports temporarily as noted in Task 7 Step 3.
- **Type consistency:** `HabitRepository` method names (`listHabits`, `getHabit`, `listLogs`, `logValue`, `upsertHabit`, `archiveHabit`) are used identically in Tasks 6, 8, 11–15. `computeStreak(habit, logs, asOf)` and `isComplete(habit, log)` signatures match across Tasks 4, 11, 12. `Insight.kind` values (`correlation | best_time | trend | story`) match between Tasks 2, 5, 14.
```

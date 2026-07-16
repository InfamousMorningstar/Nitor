# Design — Streak-freeze, Advanced Habit Management, Fresh Quotes

_Date: 2026-07-14 · Branch baseline: `main`_

Three roadmap items, implemented together because they share the domain layer, the
Habits drawer, and the Today page. Plus a user-facing feature doc and a light landing-page
strip that explains the new behaviour.

Design decisions locked with the user:

- Streak-freeze is a **per-habit earned bank**; the existing per-week `graceDaysPerWeek` stays as a
  separate manual allowance.
- A freeze **asks first** before it is spent (no silent auto-apply).
- Advanced habit management lives in the **existing habit drawer** (tabbed), not a new route.
- Quotes grow to a **verified ~60–80 bundled now**, and top up over time from **Supabase**.

---

## 1. Streak-freeze engine

### Concept

A freeze is an *earned* token that can rescue a single missed scheduled day so a streak
survives. It is distinct from `graceDaysPerWeek` (a manual, per-week "I know I'll miss Sunday"
allowance that already exists). Both count toward streaks; they do not share a counter.

- **Earn:** for every **7 completed scheduled days** accumulated since the last freeze was
  granted, grant **+1 freeze**. A grace day counts as "completed" for earning.
- **Bank cap:** **2**. Earning while at cap is a no-op (the counter still resets so you don't
  bank a hidden surplus).
- **Spend:** a freeze bridges **one isolated missed scheduled day** — a miss with a completed
  scheduled day on both sides. Two or more consecutive scheduled misses cannot be rescued.
- **Ask-first:** spending never happens silently. See UX below.

### Data model

- New optional field on `Log`: `isFreeze?: boolean`. A spent freeze writes a `Log` on the missed
  date with `isFreeze: true` (value `false`/`0`, `isGraceDay: false`).
- `computeStreak` treats `isFreeze` exactly like `isGraceDay` (counts as complete). This is the
  **only** change to the existing streak walk — one added condition in two places.
- No separate ledger table. The current bank is derived by a **single chronological simulation**
  over the habit's scheduled timeline: walk days forward from `createdAt`, counting completed
  scheduled days; every 7 completed → **if bank < 2, bank++**; either way reset the 7-counter (a
  grant at cap is skipped and the surplus is *not* stored). When a scheduled day carries an
  `isFreeze` log, that is a **spend** → bank−− at that point in time. The value at `asOf` is the
  current bank. This makes earn/spend order-correct and removes any "earned − spent" ambiguity.

### New module `src/domain/freezes.ts` (pure, unit-tested)

```ts
freezeBank(habit, logs, asOf?): number         // chronological earn/spend simulation → current bank (0..2)
rescuableMiss(habit, logs, asOf?): string | null
    // the single date a freeze could rescue right now, or null
    // (isolated scheduled miss inside the rescue window, streak length ≥ MIN_STREAK)
```

Constants: `EARN_EVERY = 7`, `BANK_CAP = 2`, `MIN_STREAK_TO_PROMPT = 3`,
`RESCUE_WINDOW_DAYS = 1` (only the immediately-preceding scheduled day is rescuable).

### Repository

Add `protectDay(habitId, date): Promise<Log>` to `HabitRepository` (writes the `isFreeze` log).
Implement in `MockHabitRepository`. Gate it behind `freezeBank > 0` in the caller, not the repo.

### Ask-first UX (Today page)

On app open / Today mount: if `settings.streakFreeze` is on, and `rescuableMiss(habit, logs)` is
non-null, and `freezeBank(habit) > 0`, render one quiet prompt per affected habit:

> 🛡 **Protect your {N}-day {Habit} streak?** You missed {weekday}. — **[Use a freeze]** · **[Let it reset]**

- **Use a freeze** → `protectDay(habitId, missedDate)`; toast "Streak protected 🛡"; streak now
  unbroken; bank −1.
- **Let it reset** → dismiss; record dismissal in a local set (`nitor.freezeDismissed`) so it does
  not nag again for that date. Streak breaks normally.
- No bank, or `streakFreeze` off → no prompt, no guilt.

The prompt is a calm inline card at the top of Today (not a modal), matching the app's forgiving tone.

### Tests

`tests/domain/freezes.test.ts`: earn cadence, cap, isolated-vs-consecutive miss detection, bank
math after spends, `rescuableMiss` windowing, interaction with grace days. Plus a `computeStreak`
regression test proving `isFreeze` bridges a gap.

---

## 2. Advanced habit management (in the drawer)

The drawer ([`HabitDrawer.tsx`](../../../src/components/habits/HabitDrawer.tsx)) becomes a
tabbed **detail mode** with three tabs. The builder (create-new) keeps its current single-form mode.

### Tabs

- **Overview** — a compact **mini-heatmap** (last ~13 weeks, since 420px is too tight for the full
  year grid), current + longest streak, momentum, and the **freeze bank** (🛡 × bank, dimmed
  slots for empty). Read-only.
- **Edit** — the existing `HabitForm`, inline. Rename, emoji, colour, category, schedule, target,
  strictness, grace days. Save persists via `upsertHabit`.
- **History** — the **back-dated editor**: the last **7 scheduled days**, each row showing that
  day's status with a control to set/correct it (type-appropriate: check for boolean/quit, number
  for count/duration/quantified). Editing writes/updates that date's `Log`. Days older than 7 are
  shown locked (read-only). Freeze-protected days are labelled 🛡 and are not editable to a miss
  without warning.

### Reorder

- Add `order: number` to `Habit` (persisted). Habits list sorts by `order` then `createdAt`.
- Drag-to-reorder on the Habits list (pointer), plus keyboard reorder (focus a habit, `Alt+↑/↓`)
  for accessibility. Honour `prefers-reduced-motion` (no drag animation, instant reflow).
- Migration: habits without `order` get one derived from current sort index on first load.

### Cleanup

Retire the orphan `src/app/habits/[id]/page.tsx` (stale earlier-build detail route) so the drawer
is the single detail surface. Redirect `/habits/[id]` → `/habits` (or remove the route entirely).

### Tests

Reorder ordering + migration; back-date editor writes correct `Log` for each habit type and
respects the 7-day lock; freeze bank renders correct filled/empty slots.

---

## 3. Quotes — verified pool + Supabase top-up

### Bundled pool

Grow `QUOTES` in [`quotes.ts`](../../../src/domain/quotes.ts) from 12 to a **verified ~60–80**.
Every entry keeps the hard rule: real, checkable **primary** source (original work / interview),
no aggregator fluff, no misattribution. A subagent drafts candidates in batches and verifies each
source before inclusion; unverifiable candidates are dropped.

### Source seam

```ts
interface QuoteSource { all(): Quote[]; }          // bundled ∪ cachedRemote
quoteOfDay(date): Quote                             // deterministic date-rotation over source.all()
```

`quoteOfDay` keeps its date-hash rotation but draws from the merged set, so with 60–80+ quotes a
repeat is months away.

### Supabase remote top-up

- Table `public.quotes` (columns mirror the `Quote` type: `text`, `author`, `source`,
  `tradition`, `themes text[]`, plus `id`, `created_at`). **RLS: public `select` only**, no
  insert/update from the client.
- Client helper `src/data/quotes/remote.ts`:
  - Reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - **If unset → no-op**, app runs on the bundled pool alone (this is the current state until
    Supabase is provisioned).
  - If set: on app load, if the local cache (`nitor.quotes.cache` + `nitor.quotes.fetchedAt`) is
    older than **N = 14 days**, fetch quotes via Supabase REST/JS, **validate each row has a
    non-empty `source`**, dedupe against bundled by normalized `text`, and cache locally.
  - Merge is additive and non-blocking; a failed fetch silently keeps the last good cache.

### Provisioning note (out of band)

Creating the Supabase project, `quotes` table, RLS policy, seed, and env vars requires the
Supabase connector to be authorized (interactive `/mcp` or `claude mcp`) — it cannot be done from a
non-interactive session. Deliverables this pass: the client helper (degrading gracefully), a
`supabase/quotes.sql` migration (table + RLS + grant), and a seed script that pushes the verified
bundled pool into the table once credentials exist. Consult the `supabase` skill at implementation
time.

### Tests

`quoteOfDay` determinism over a merged source; remote validation rejects sourceless rows; dedupe by
normalized text; graceful degradation when env vars are missing.

---

## 4. Feature doc + landing strip

### `docs/features/how-it-works.md`

Polished, plain-language, user-facing. Sections: **Forgiving streaks** (grace days vs earned
freezes, how earning/banking/ask-first works), **Fix any day** (back-dated editor, reorder,
detail view), **Quotes that stay fresh** (verified sourcing + rotation). Written so it can be shown
to users as-is (no internal jargon).

### Landing page — "How it works" strip

A small strip **under the hero** on `/`: 3 short cards — **Forgiving streaks · Fix any day ·
Quotes that stay fresh** — one line each, linking to the feature doc. Keeps the landing light; the
detail lives in the file. Matches the existing editorial matte style, reduced-motion safe.

---

## Build order

1. `freezes.ts` + `computeStreak` `isFreeze` change + tests (pure domain, no UI).
2. Repository `protectDay` + `Log.isFreeze` + mock impl + tests.
3. Today ask-first prompt.
4. Habit `order` + reorder + migration.
5. Drawer tabbed detail (Overview / Edit / History) + back-date editor.
6. Retire `/habits/[id]`.
7. Quote pool expansion (subagent-verified) + `QuoteSource` seam + `quoteOfDay` change.
8. Supabase `remote.ts` + `quotes.sql` + seed script (graceful-degrade; unprovisioned for now).
9. `how-it-works.md` + landing strip.
10. Full test run, typecheck, in-browser verification, update `PROGRESS.md` + `.remember/`.

## Non-goals (this pass)

- Full Supabase auth / Postgres for habits & logs (Phase 2 proper).
- Silent auto-freeze (explicitly rejected — ask-first).
- Editing check-ins older than 7 days.
- The full-year heatmap inside the drawer (mini-heatmap only).

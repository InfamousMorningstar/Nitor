# Phase 2 Persistence & RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make habits and logs real per-user Supabase data behind the frozen `HabitRepository` seam, with deny-by-default RLS proven by a live cross-user negative test.

**Architecture:** Two `text`-keyed tables (`habits`, `logs`), each carrying a server-owned `user_id uuid default auth.uid()` and four `authenticated`-only RLS policies scoped by `(select auth.uid()) = user_id`. `SupabaseHabitRepository` (Codex) maps the domain to these columns; `RepositoryProvider` selects it when a session exists, else the seeded in-memory mock.

**Tech Stack:** Next.js App Router, `@supabase/ssr` (browser client), Postgres + RLS, Vitest, `tsx` verification scripts using plain `fetch` against PostgREST.

## Global Constraints

- Interface `src/data/repository.ts` is **frozen** — no signature changes.
- IDs are client-generated **text**: `Habit.id` = `h_<ts>_<rand>`, `Log.id` = `${habitId}_${date}`. `user_id` is the only server `uuid`.
- `Log.value` (`number | boolean`) and `Habit.schedule` stored as `jsonb`, verbatim round-trip.
- Date-shaped domain fields (`created_at`, `start_date`, `logs.date`) stay `text`.
- RLS deny-by-default; `(select auth.uid())` initPlan form; every policy `to authenticated`; `create policy` preceded by `drop policy if exists` (re-runnable).
- Publishable/secret keys only — never anon/service_role. `SUPABASE_SECRET_KEY` is server/script-only.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- `src/proxy.ts` stays put; `getUser()`/`getClaims()` not `getSession()`; `setAll(cookies, headers)`.
- **Ownership:** Tasks 1, 2, 4, 5 are Claude's. Task 3 is Codex's (`SupabaseHabitRepository.ts`) — Claude does not edit that file. Never two writers in one checkout at once.
- Do not commit final work until every Task 5 gate passes.

---

## File Structure

- Create `supabase/habits.sql` — habits + logs tables, indexes, RLS (Task 1).
- Create `src/data/repositorySelection.ts` — pure `pickRepository()` helper (Task 2).
- Modify `src/state/RepositoryProvider.tsx` — session-driven repo selection (Task 2).
- Create `src/data/repositorySelection.test.ts` — selection unit test (Task 2).
- Create `src/data/SupabaseHabitRepository.ts` — **Codex** (Task 3).
- Create `scripts/verify-rls.ts` — live RLS isolation + field-fidelity round-trip (Task 4).

---

### Task 1: `habits.sql` — tables, indexes, RLS

**Files:**
- Create: `supabase/habits.sql`

**Interfaces:**
- Produces: tables `public.habits` and `public.logs` with the column contract in the spec; consumed by Task 3 (`SupabaseHabitRepository`) and Task 4 (verify script).

- [ ] **Step 1: Write the schema file**

```sql
-- Nitor habits + logs: per-user habit data. Phase 2 slice 2 (persistence & RLS).
-- Run once against the provisioned Supabase project (SQL editor or apply_migration).
--
-- IDs are client-generated text (h_<ts>_<rand>, and ${habitId}_${date} for logs),
-- so id columns are text, not uuid. user_id is the only server-owned uuid; it
-- defaults to auth.uid() so the client never sends it and cannot forge it (the
-- insert with-check pins it). value and schedule are jsonb for an exact round-trip
-- of Log.value (number|boolean) and the nested Schedule object. Date-shaped fields
-- stay text to preserve the domain's YYYY-MM-DD / ISO strings verbatim.

create table if not exists public.habits (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null,
  color text not null,
  category text not null,
  type text not null check (type in ('duration', 'boolean', 'count', 'quantified', 'quit')),
  target_value numeric,
  schedule jsonb not null,
  strictness text not null check (strictness in ('strict', 'balanced', 'flexible')),
  grace_days_per_week integer not null,
  archived boolean not null default false,
  created_at text not null,
  unit text,
  start_date text,
  sort_order integer
);

create index if not exists habits_user_id_idx on public.habits (user_id);

create table if not exists public.logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id text not null references public.habits (id) on delete cascade,
  date text not null,
  value jsonb not null,
  note text,
  is_grace_day boolean not null default false,
  is_freeze boolean not null default false,
  created_at text not null,
  constraint logs_user_habit_date_key unique (user_id, habit_id, date)
);
-- The unique constraint backs SupabaseHabitRepository.logValue's upsert
-- (on conflict (user_id, habit_id, date)).

create index if not exists logs_user_habit_idx on public.logs (user_id, habit_id);
create index if not exists logs_user_date_idx on public.logs (user_id, date);

alter table public.habits enable row level security;
alter table public.logs enable row level security;

-- Deny-by-default: only the policies below open anything, all to authenticated.
-- `(select auth.uid())` is the initPlan form (evaluated once per statement).
-- `create policy` has no `if not exists`, so each is dropped first — re-runnable.

-- habits
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- logs
drop policy if exists "logs_select_own" on public.logs;
create policy "logs_select_own" on public.logs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "logs_insert_own" on public.logs;
create policy "logs_insert_own" on public.logs
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "logs_update_own" on public.logs;
create policy "logs_update_own" on public.logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "logs_delete_own" on public.logs;
create policy "logs_delete_own" on public.logs
  for delete to authenticated using ((select auth.uid()) = user_id);
```

- [ ] **Step 2: Apply to the live project**

Apply via the Supabase MCP `apply_migration` (name `habits_and_logs_rls`) or the SQL editor.
Expected: no error; re-running is a no-op (idempotent).

- [ ] **Step 3: Verify structure + advisors**

Run `list_tables` (schema `public`) and confirm `habits` + `logs` exist with RLS enabled.
Run `get_advisors` (type `security`); expected: no new "RLS disabled"/"policy exists but RLS disabled" findings for these tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/habits.sql
git commit -m "feat(db): habits + logs tables with per-user RLS"
```

---

### Task 2: Session-driven repository selection

**Files:**
- Create: `src/data/repositorySelection.ts`
- Create: `src/data/repositorySelection.test.ts`
- Modify: `src/state/RepositoryProvider.tsx`

**Interfaces:**
- Consumes: `useSession()` → `{ user, loading }` from `src/state/SessionProvider.tsx`; `createSeededRepository()` from the mock; `SupabaseHabitRepository` constructor from Task 3.
- Produces: `pickRepository(args: { loading: boolean; userId: string | null; mock: HabitRepository; makeSupabase: () => HabitRepository }): HabitRepository`.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/repositorySelection.test.ts
import { describe, it, expect, vi } from "vitest";
import { pickRepository } from "./repositorySelection";
import type { HabitRepository } from "./repository";

const stub = (tag: string) => ({ tag }) as unknown as HabitRepository;

describe("pickRepository", () => {
  it("returns the mock while the session is loading", () => {
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: true, userId: "u1", mock, makeSupabase })).toBe(mock);
    expect(makeSupabase).not.toHaveBeenCalled();
  });

  it("returns the mock when there is no user", () => {
    const mock = stub("mock");
    const makeSupabase = vi.fn(() => stub("supabase"));
    expect(pickRepository({ loading: false, userId: null, mock, makeSupabase })).toBe(mock);
    expect(makeSupabase).not.toHaveBeenCalled();
  });

  it("builds the Supabase repo for an authenticated user", () => {
    const mock = stub("mock");
    const supa = stub("supabase");
    const makeSupabase = vi.fn(() => supa);
    expect(pickRepository({ loading: false, userId: "u1", mock, makeSupabase })).toBe(supa);
    expect(makeSupabase).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/repositorySelection.test.ts`
Expected: FAIL — `pickRepository` is not defined.

- [ ] **Step 3: Write the helper**

```ts
// src/data/repositorySelection.ts
import type { HabitRepository } from "./repository";

/**
 * Chooses the repository for the current session. While the session is still
 * resolving we hold the mock to avoid a flash of the wrong data; an
 * authenticated user gets the Supabase repo (per-user isolation via RLS);
 * everyone else gets the seeded in-memory mock (guest experience).
 */
export function pickRepository(args: {
  loading: boolean;
  userId: string | null;
  mock: HabitRepository;
  makeSupabase: () => HabitRepository;
}): HabitRepository {
  const { loading, userId, mock, makeSupabase } = args;
  if (loading || !userId) return mock;
  return makeSupabase();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/repositorySelection.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the provider**

Replace `src/state/RepositoryProvider.tsx` body so the repo tracks the session. The
Supabase repo is rebuilt only when the user id changes (memoized on `user?.id`), the
mock is created once, and the quote top-up effect is preserved:

```tsx
"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import { SupabaseHabitRepository } from "@/data/SupabaseHabitRepository";
import { pickRepository } from "@/data/repositorySelection";
import type { HabitRepository } from "@/data/repository";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/state/SessionProvider";
import { loadRemoteQuotes } from "@/data/quotes/remote";

const Ctx = createContext<HabitRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  const mockRef = useRef<HabitRepository | null>(null);
  if (!mockRef.current) mockRef.current = createSeededRepository();

  const repository = useMemo(
    () =>
      pickRepository({
        loading,
        userId: user?.id ?? null,
        mock: mockRef.current as HabitRepository,
        makeSupabase: () => new SupabaseHabitRepository(createClient()),
      }),
    [loading, user?.id],
  );

  useEffect(() => {
    void loadRemoteQuotes();
  }, []);

  return <Ctx.Provider value={repository}>{children}</Ctx.Provider>;
}

export function useRepository(): HabitRepository {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRepository must be used within RepositoryProvider");
  return c;
}
```

> Note: this import of `SupabaseHabitRepository` (Task 3) will not typecheck until
> Task 3 lands. Sequence Task 3 before running the build in Task 5.

- [ ] **Step 6: Run the selection test + typecheck the helper**

Run: `npx vitest run src/data/repositorySelection.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/repositorySelection.ts src/data/repositorySelection.test.ts src/state/RepositoryProvider.tsx
git commit -m "feat(state): select Supabase repo when authenticated, mock otherwise"
```

---

### Task 3: `SupabaseHabitRepository` — CODEX

**Owner:** Codex (Claude does not write or edit this file). Claude hands Codex a
workspace-write prompt after Task 1 commits, so the prompt quotes the frozen column
names.

**Files:**
- Create: `src/data/SupabaseHabitRepository.ts`

**Interfaces:**
- Consumes: a `SupabaseClient` (from `@supabase/ssr` `createClient()`), the column contract from Task 1, the domain types in `src/domain/types.ts`, `HabitRepository` + `LogInput` in `src/data/repository.ts`.
- Produces: `class SupabaseHabitRepository implements HabitRepository` with a single constructor param `constructor(private client: SupabaseClient)`.

**Contract (row ⇄ domain mapping):**

| domain (`Habit`) | row (`habits`) | notes |
|---|---|---|
| `id` | `id` | text |
| — | `user_id` | never sent on write (DB default `auth.uid()`); never read into domain |
| `name`,`emoji`,`color`,`category`,`type` | same snake/lower | |
| `targetValue` | `target_value` | `null` ⇄ `null` |
| `schedule` | `schedule` | whole object as jsonb |
| `strictness` | `strictness` | |
| `graceDaysPerWeek` | `grace_days_per_week` | |
| `archived` | `archived` | |
| `createdAt` | `created_at` | text |
| `unit` | `unit` | optional; `undefined` ⇄ `null` |
| `startDate` | `start_date` | optional |
| `order` | `sort_order` | optional |

| domain (`Log`) | row (`logs`) | notes |
|---|---|---|
| `id` | `id` | `${habitId}_${date}` |
| `habitId` | `habit_id` | |
| `date` | `date` | |
| `value` | `value` | jsonb; `true`/`false`/number verbatim |
| `note` | `note` | optional |
| `isGraceDay` | `is_grace_day` | |
| `isFreeze` | `is_freeze` | optional in domain; column defaults false |
| `createdAt` | `created_at` | ISO text |

**Method contract:**
- `listHabits()` → `select` where `archived = false`, ordered by `sort_order` nulls last then `created_at`; map rows → `Habit[]`.
- `getHabit(id)` → `select ... eq('id', id).maybeSingle()`; `undefined` when absent.
- `listLogs(habitId?)` → `select`, optional `.eq('habit_id', habitId)`; map → `Log[]`.
- `logValue(input)` → build the row (`id = \`${habitId}_${date}\``, `created_at = new Date().toISOString()`, defaults `is_grace_day`/`is_freeze` = false), `upsert(..., { onConflict: 'user_id,habit_id,date' })`, `.select().single()`, return mapped `Log`. Do **not** send `user_id`.
- `upsertHabit(habit)` → map domain → row (omit `user_id`), `upsert(row).select().single()`, return mapped `Habit`.
- `archiveHabit(id)` → `update({ archived: true }).eq('id', id)`.
- `deleteHabit(id)` → `delete().eq('id', id)` (logs cascade in the DB).

All queries rely on RLS for per-user scoping — do not add app-side `user_id` filters
(they are redundant, and their absence must not be a security dependency). Every
call checks the returned `error` and throws on failure. No field may be dropped or
coerced; the Task 4 round-trip asserts this.

- [ ] **Step 1:** Claude dispatches the Codex workspace-write prompt (post Task 1). Codex creates the file per the contract above, runs `npx tsc --noEmit` clean, and reports.
- [ ] **Step 2:** Claude reviews the file for per-user scoping and field fidelity (Task 5 review), before verification.

_No commit here yet — the file is verified and committed as part of Task 5, or committed by Codex per its own run and reviewed by Claude before the Task 5 gates._

---

### Task 4: `verify-rls.ts` — live isolation + field-fidelity round-trip

**Files:**
- Create: `scripts/verify-rls.ts`

**Interfaces:**
- Consumes: env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`; the live `habits`/`logs` tables + RLS from Task 1.
- Produces: a pass/fail report; exit code 1 on any assertion failure. Uses plain `fetch` against PostgREST + GoTrue (no new dependency), mirroring `scripts/seed-quotes.ts`.

Behavior:
1. **Admin (secret key)** creates two confirmed users A and B (`POST /auth/v1/admin/users`, `email_confirm: true`), unique emails per run.
2. **Password sign-in** each (`POST /auth/v1/token?grant_type=password`) → per-user `access_token`.
3. As A (publishable apikey + `Authorization: Bearer <A jwt>`), `POST /rest/v1/habits` a habit exercising every field, then a backdated log (jsonb `value`, `is_freeze: true`).
4. **Fidelity:** read A's habit + log back as A; assert every field equals what was written (including `schedule` object, `sort_order`, `target_value`, `unit`, `start_date`, `value` type/shape, `is_freeze`).
5. **Isolation (negative):** as B, `GET /rest/v1/habits?select=*` and the log endpoint → assert **zero** of A's rows returned. As B, `PATCH`/`DELETE` A's habit id → assert **zero rows affected** (`Prefer: return=representation` returns `[]`), and re-read as A to confirm the row is unchanged/still present.
6. **Anon:** with only the publishable apikey and no bearer, `GET /rest/v1/habits` → assert zero rows.
7. **Cleanup:** admin-delete A and B (rows cascade). Print `VERIFY-RLS: PASS`.

- [ ] **Step 1: Write the script**

```ts
// scripts/verify-rls.ts
// Live RLS isolation + field-fidelity round-trip against the real Supabase project.
// Run: npx tsx --env-file=.env.local scripts/verify-rls.ts
// Uses plain fetch against GoTrue (/auth/v1) and PostgREST (/rest/v1), no new deps.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY");
  process.exit(1);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`VERIFY-RLS: FAIL — ${msg}`);
    process.exit(1);
  }
}

const adminHeaders = { apikey: secret!, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

async function createUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = await res.json();
  assert(res.ok, `create user ${email}: ${res.status} ${JSON.stringify(body)}`);
  return body.id as string;
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishable!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  assert(res.ok && body.access_token, `sign in ${email}: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token as string;
}

function userHeaders(jwt: string) {
  return { apikey: publishable!, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
}

async function deleteUser(id: string): Promise<void> {
  await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: adminHeaders });
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const aEmail = `rls-a-${stamp}@example.com`;
  const bEmail = `rls-b-${stamp}@example.com`;
  const pw = `Test-passphrase-${stamp}!`;

  const aId = await createUser(aEmail, pw);
  const bId = await createUser(bEmail, pw);
  try {
    const aJwt = await signIn(aEmail, pw);
    const bJwt = await signIn(bEmail, pw);

    const habitId = `h_${stamp}_rls`;
    const habit = {
      id: habitId,
      name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
      type: "quantified", target_value: 30, unit: "pages",
      schedule: { kind: "everyNDays", everyNDays: 2 },
      strictness: "balanced", grace_days_per_week: 1,
      archived: false, created_at: "2026-07-01", start_date: "2026-07-01", sort_order: 3,
    };
    let res = await fetch(`${url}/rest/v1/habits`, {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify(habit),
    });
    let rows = await res.json();
    assert(res.ok && Array.isArray(rows) && rows.length === 1, `A insert habit: ${res.status} ${JSON.stringify(rows)}`);
    assert(rows[0].user_id === aId, "A's habit.user_id defaulted to A");

    const logId = `${habitId}_2026-07-02`;
    const log = { id: logId, habit_id: habitId, date: "2026-07-02", value: 42, note: "n", is_grace_day: false, is_freeze: true, created_at: new Date().toISOString() };
    res = await fetch(`${url}/rest/v1/logs`, {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify(log),
    });
    rows = await res.json();
    assert(res.ok && rows.length === 1, `A insert log: ${res.status} ${JSON.stringify(rows)}`);

    // Fidelity: read A's habit back as A
    res = await fetch(`${url}/rest/v1/habits?id=eq.${habitId}&select=*`, { headers: userHeaders(aJwt) });
    const [got] = await res.json();
    assert(got.schedule.kind === "everyNDays" && got.schedule.everyNDays === 2, "schedule round-trip");
    assert(got.target_value === 30 && got.unit === "pages" && got.sort_order === 3, "numeric/text fields round-trip");
    assert(got.start_date === "2026-07-01" && got.created_at === "2026-07-01", "date strings round-trip");
    res = await fetch(`${url}/rest/v1/logs?id=eq.${logId}&select=*`, { headers: userHeaders(aJwt) });
    const [gotLog] = await res.json();
    assert(gotLog.value === 42 && gotLog.is_freeze === true, "log value + freeze round-trip");

    // Isolation: B sees none of A's rows
    res = await fetch(`${url}/rest/v1/habits?select=*`, { headers: userHeaders(bJwt) });
    assert((await res.json()).length === 0, "B reads zero habits (A's are hidden)");
    res = await fetch(`${url}/rest/v1/logs?select=*`, { headers: userHeaders(bJwt) });
    assert((await res.json()).length === 0, "B reads zero logs");

    // B cannot update or delete A's habit
    res = await fetch(`${url}/rest/v1/habits?id=eq.${habitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ name: "hacked" }),
    });
    assert((await res.json()).length === 0, "B's PATCH of A's habit affects zero rows");
    res = await fetch(`${url}/rest/v1/habits?id=eq.${habitId}`, {
      method: "DELETE",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
    });
    assert((await res.json()).length === 0, "B's DELETE of A's habit affects zero rows");

    // A confirms the row is intact
    res = await fetch(`${url}/rest/v1/habits?id=eq.${habitId}&select=name`, { headers: userHeaders(aJwt) });
    assert((await res.json())[0].name === "Read", "A's habit unchanged after B's attempts");

    // Anon sees nothing
    res = await fetch(`${url}/rest/v1/habits?select=*`, { headers: { apikey: publishable! } });
    assert((await res.json()).length === 0, "anon reads zero habits");

    console.log("VERIFY-RLS: PASS");
  } finally {
    await deleteUser(aId);
    await deleteUser(bId);
  }
}

main().catch((e) => {
  console.error("VERIFY-RLS: FAIL —", e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script (requires Task 1 applied)**

Run: `npx tsx --env-file=.env.local scripts/verify-rls.ts`
Expected: final line `VERIFY-RLS: PASS`, exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-rls.ts
git commit -m "test(db): live RLS isolation + field-fidelity verification script"
```

---

### Task 5: Full verification gate + dual security review

**Files:** none new — this task runs gates and integrates Codex's Task 3 file.

- [ ] **Step 1: Claude reviews Codex's `SupabaseHabitRepository.ts`**

Confirm: no app-side `user_id` filter substituting for RLS; `user_id` never sent on write; every field in both mapping tables present (type, schedule, strictness, graceDaysPerWeek, order→sort_order, targetValue, unit, archived, startDate, createdAt, freeze, backdated logs); `onConflict: 'user_id,habit_id,date'`; every `error` checked. Fix gaps by asking Codex to revise (do not edit the file).

- [ ] **Step 2: Codex independent read-only security review of the diff**

Run the canonical read-only review (per CLAUDE.md) over the branch diff, focused on the RLS policies and repository scoping. Evaluate findings; apply corrections to Claude-owned files, or route repository fixes back to Codex.

- [ ] **Step 3: Typecheck + full suite**

Run: `npx tsc --noEmit` → expected clean.
Run: `npm test` (or `npx vitest run`) → expected all green including `repositorySelection.test.ts`.

- [ ] **Step 4: Build with proxy present**

Run: `npm run build`
Expected: build succeeds and output contains `ƒ Proxy (Middleware)` (grep the output).

- [ ] **Step 5: Live RLS + fidelity**

Run: `npx tsx --env-file=.env.local scripts/verify-rls.ts`
Expected: `VERIFY-RLS: PASS`.

- [ ] **Step 6: End-to-end persistence (real runtime)**

Boot `npm run dev`, sign in as a real test user, create a habit, log it, edit it, archive one and delete another; reload the page and confirm the surviving state persisted (came from Supabase, not the mock). Capture evidence.

- [ ] **Step 7: Final commit (only after every gate above passes)**

```bash
git add -A
git commit -m "feat(data): persist habits + logs per-user via Supabase behind HabitRepository"
```

---

## Self-Review

**Spec coverage:** tables + indexes + RLS (Task 1) ✓; provider wiring + start-empty for new users (Task 2, mock-for-guest / supabase-for-user) ✓; `SupabaseHabitRepository` contract & fields (Task 3) ✓; live RLS negative test + field fidelity (Task 4) ✓; build/proxy, suite, e2e, dual security review (Task 5) ✓; ownership/sequencing (Global Constraints + Task 3 owner note) ✓.

**Placeholder scan:** no TBD/TODO; all code shown; Task 3 is a deliberate delegation with a complete contract rather than a placeholder.

**Type consistency:** `pickRepository` signature identical in interface block, test, helper, and provider call site; `SupabaseHabitRepository(client)` constructor matches the provider's `new SupabaseHabitRepository(createClient())`; column names identical across Task 1 SQL, Task 3 contract, and Task 4 script.

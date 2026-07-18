# Phase 2 Slice 2 — Persistence & RLS

_Design doc · 2026-07-18 · branch `feat/phase2-identity`_

## Goal

Make habits and logs **real per-user data** in Supabase, behind the frozen
`HabitRepository` seam. This is the security-critical half of Phase 2: the beta
notice's "your data is safe" only becomes true once every row is scoped to its
owner by row-level security. Slice 1 (identity & session) shipped `auth.uid()`;
this slice builds the owned tables on top of it.

## Scope

**In:** `habits` + `logs` tables with `user_id`, indexes, deny-by-default RLS;
`SupabaseHabitRepository` (implemented by Codex) behind the existing interface;
provider wiring that selects the Supabase repo when authenticated and the
in-memory mock otherwise; live RLS verification.

**Out:** settings/pet sync, notifications, import-merge (later slices). No change
to the `HabitRepository` interface — it is frozen. No migration of demo seed data
into real accounts.

## Contract: the frozen interface

`src/data/repository.ts` is unchanged. Both repositories implement:

```ts
listHabits(): Promise<Habit[]>            // non-archived, caller's own
getHabit(id): Promise<Habit | undefined>
listLogs(habitId?): Promise<Log[]>
logValue(input: LogInput): Promise<Log>   // upsert on (habit, date)
upsertHabit(habit: Habit): Promise<Habit>
archiveHabit(id): Promise<void>
deleteHabit(id): Promise<void>            // also removes the habit's logs
```

IDs are **client-generated text**, not UUIDs: `Habit.id` is `h_<ts>_<rand>`
(`HabitForm.newHabitId()`), `Log.id` is `${habitId}_${date}`. The id columns are
therefore `text`. `user_id` is the only server-owned `uuid`.

## Data model

Column names are the snake_case of the domain fields — this is the contract
`SupabaseHabitRepository` maps against. `Log.value` (a `number | boolean` union)
and `Habit.schedule` (a nested object) are stored as `jsonb` so the round-trip is
exactly faithful; all streak/stats math is client-side, so the DB needs faithful
storage, not server-side aggregation. Date-shaped domain fields
(`created_at`, `start_date`, `logs.date`) stay `text` to preserve the domain's
`YYYY-MM-DD`/ISO strings verbatim rather than risk format drift through
`date`/`timestamptz`.

### `public.habits`

| column | type | domain field |
|---|---|---|
| `id` | `text` primary key | `Habit.id` |
| `user_id` | `uuid not null default auth.uid()` → `auth.users(id)` on delete cascade | owner |
| `name` | `text not null` | `name` |
| `emoji` | `text not null` | `emoji` |
| `color` | `text not null` | `color` |
| `category` | `text not null` | `category` |
| `type` | `text not null` check in (`duration`,`boolean`,`count`,`quantified`,`quit`) | `type` |
| `target_value` | `numeric` null | `targetValue` |
| `schedule` | `jsonb not null` | `schedule` (whole `Schedule` object) |
| `strictness` | `text not null` check in (`strict`,`balanced`,`flexible`) | `strictness` |
| `grace_days_per_week` | `integer not null` | `graceDaysPerWeek` |
| `archived` | `boolean not null default false` | `archived` |
| `created_at` | `text not null` | `createdAt` (YYYY-MM-DD) |
| `unit` | `text` null | `unit?` |
| `start_date` | `text` null | `startDate?` |
| `sort_order` | `integer` null | `order?` (`order` is a reserved word) |

Index: `habits(user_id)`.

### `public.logs`

| column | type | domain field |
|---|---|---|
| `id` | `text` primary key | `Log.id` |
| `user_id` | `uuid not null default auth.uid()` → `auth.users(id)` on delete cascade | owner |
| `habit_id` | `text not null` → `habits(id)` on delete cascade | `habitId` |
| `date` | `text not null` | `date` (YYYY-MM-DD) |
| `value` | `jsonb not null` | `value` (`true`/`false`/number verbatim) |
| `note` | `text` null | `note?` |
| `is_grace_day` | `boolean not null default false` | `isGraceDay` |
| `is_freeze` | `boolean not null default false` | `isFreeze?` |
| `created_at` | `text not null` | `createdAt` (ISO) |

Constraint: `unique (user_id, habit_id, date)` — one log per habit per day; this
backs `logValue`'s upsert (`on conflict (user_id, habit_id, date)`).
Indexes: `logs(user_id, habit_id)`, `logs(user_id, date)`.

The `habit_id` → `habits(id)` cascade delete reproduces the mock's `deleteHabit`,
which wipes the habit's logs.

## Row-level security

Both tables: `enable row level security`, **deny by default** — only the policies
below open anything. Four policies each, all `to authenticated`:

- `select` — `using ((select auth.uid()) = user_id)`
- `insert` — `with check ((select auth.uid()) = user_id)`
- `update` — `using` **and** `with check` on `(select auth.uid()) = user_id`
  (so a row can never be reassigned to another user)
- `delete` — `using ((select auth.uid()) = user_id)`

`(select auth.uid())` (initPlan form) matches `profiles.sql` — evaluated once per
statement, not per row. `user_id` defaults to `auth.uid()`, so the repository
never sends it and the insert `with check` makes forging it impossible. `create
policy` has no `if not exists`, so each policy is `drop policy if exists` first —
the file is re-runnable, same idempotency discipline as `profiles.sql` /
`quotes.sql`.

`anon` gets nothing (no policy names it; RLS denies by default). No service_role
or secret-key path touches these tables from the client.

## Provider wiring

`RepositoryProvider` already nests inside `SessionProvider`, so it consumes
`useSession()`:

- `loading` → hold the seeded mock (avoids a flash of the wrong repo).
- `user` non-null → construct and memoize a `SupabaseHabitRepository` bound to the
  browser client; per-user isolation is enforced by RLS, not by app-side filters.
- `user` null → the seeded in-memory mock (guest/unauthenticated experience keeps
  the demo seed).

On login/logout the `user` identity changes, the memoized repo swaps, and the
habit hooks refetch. New authenticated users start with **empty** rows; the
3-step onboarding populates them. The quote top-up effect is unchanged.

## Ownership & sequencing

Security-critical pieces are Claude's; the repository mapping is Codex's (heavy
writing on ChatGPT quota). Sequenced, never two writers in one checkout at once:

1. **Claude** writes `supabase/habits.sql` (tables + RLS) + provider wiring +
   provider-selection test. This freezes the column contract.
2. **Codex** writes `src/data/SupabaseHabitRepository.ts` against that contract
   and the frozen interface. Claude does not edit this file.
3. **Both** review security at the end: Claude reviews Codex's file for per-user
   scoping and field fidelity and re-reads the RLS; Codex does an independent
   read-only pass over the whole diff.
4. **Claude** verifies.

## Verification (evidence, not static green)

Static gates missed five defects on slice 1; every claim here exercises the real
thing:

1. **Live RLS negative test** — apply the schema to the real project. As user A,
   insert a habit + log. With user B's client, prove `select` returns zero of A's
   rows, and B's `update`/`delete` targeting A's id affect zero rows. Run against
   real Supabase, capture output.
2. **Field fidelity** — round-trip a habit exercising every field (type, schedule,
   strictness, graceDaysPerWeek, order, targetValue, unit, archived, startDate,
   createdAt, freeze state, backdated logs) through `SupabaseHabitRepository` and
   assert nothing is dropped or coerced.
3. `npm run build` output contains `ƒ Proxy (Middleware)`.
4. Full vitest suite green + a new provider-selection test (session → Supabase
   repo; no session → mock).
5. Boot dev server, sign in, create/log/edit/archive/delete a habit, reload,
   confirm persistence.
6. Codex read-only security review of the diff; Claude review of Codex's file.

## Gotchas honored (from slice 1)

- `getClaims()` / `getUser()`, never `getSession()` in trust decisions.
- `setAll` takes `(cookies, headers)`; `src/proxy.ts` stays put.
- Publishable/secret keys only — never anon/service_role.
- Do not commit until every gate above passes.

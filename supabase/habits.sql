-- Nitor habits + logs: per-user habit data. Phase 2 slice 2 (persistence & RLS).
-- Run once against the provisioned Supabase project (SQL editor or apply_migration).
--
-- IDs are client-generated text (h_<ts>_<rand>, and ${habitId}_${date} for logs),
-- so id columns are text, not uuid. user_id is the only server-owned uuid; it
-- defaults to auth.uid() so the client never sends it and cannot forge it (the
-- insert with-check pins it). value and schedule are jsonb for an exact round-trip
-- of Log.value (number|boolean) and the nested Schedule object. Date-shaped fields
-- stay text to preserve the domain's YYYY-MM-DD / ISO strings verbatim.
--
-- TENANCY (why logs are keyed and referenced by (user_id, ...) below):
-- Postgres validates a foreign key with RLS bypassed, so a single-column
-- `logs.habit_id -> habits(id)` reference is checked against EVERY tenant's
-- habits, not just the caller's. That handed another user three things:
--   1. an existence oracle — FK success vs. failure reveals whether a guessed
--      habit id exists for somebody;
--   2. a cross-tenant "ghost" log attached to a habit they do not own, and a
--      delete of the owner's habit cascading into that row;
--   3. preemption — because log ids are the deterministic `${habitId}_${date}`
--      and `id` was GLOBALLY primary, user B could claim `${A_HABIT}_${DATE}`
--      and make A's later write for that date fail on the logs primary key,
--      which is not the declared (user_id, habit_id, date) upsert arbiter.
-- Both are closed structurally: the log's primary key is (user_id, id) so an id
-- is only ever claimable inside your own tenant, and the FK is composite —
-- (user_id, habit_id) -> habits(user_id, id) — so a log can only reference a
-- habit that carries the SAME user_id the insert with-check already pinned to
-- auth.uid(). Ownership is therefore a property of the relationship itself, not
-- something the application has to re-check.

create table if not exists public.habits (
  id text not null,
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
  sort_order integer,
  -- Tenant-qualified, not `id` alone — see the rationale below the table.
  constraint habits_pkey primary key (user_id, id)
);

create index if not exists habits_user_id_idx on public.habits (user_id);

-- Habit identity is tenant-qualified: the primary key is (user_id, id), and a
-- matching unique constraint backs the composite log FK.
--
-- Why the primary key moved off `id` alone: a globally primary habit id is
-- globally CLAIMABLE. Another user could insert a habit carrying an id this
-- user was about to use, and the rightful owner's upsert would then collide
-- with a row RLS makes invisible to them — their own habit simply could not be
-- created, and the failure would be indistinguishable from a bug. That is the
-- same preemption/oracle pattern the logs relationship below closes, one level
-- up, and random ids only make it unlikely rather than impossible. Identity is
-- now scoped to the tenant, so one user's ids cannot constrain another's.
--
-- Both constraints are added conditionally rather than dropped-and-re-added:
-- once logs exist, the composite FK DEPENDS on one of them, and Postgres
-- refuses to drop a unique constraint a foreign key references (without
-- CASCADE). A drop-then-add pair therefore works on a fresh database and
-- aborts the whole file on the second run — taking the RLS policies at the
-- bottom with it.
--
-- The unique constraint is kept even though the primary key now covers the
-- same columns. It is redundant as an index, but re-adding a validated
-- composite FK is the riskiest operation in this file (see the NOT VALID dance
-- further down) and dropping the unique would force exactly that, to save one
-- btree on a table holding tens of rows per user.
do $$
declare
  pk_cols text;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.habits'::regclass
      and conname = 'habits_user_id_id_key'
  ) then
    alter table public.habits add constraint habits_user_id_id_key unique (user_id, id);
  end if;

  -- On a pre-fix database the LEGACY single-column logs FK references
  -- habits(id), which means it depends on the habits_pkey(id) index — and
  -- Postgres refuses to drop a constraint another object depends on. The flip
  -- below would abort with 2BP01 while that FK exists, so it goes first. The
  -- logs block further down drops it again harmlessly; here it is a
  -- precondition, not cleanup. Guarded on the table existing at all, because
  -- on a fresh install this block runs before public.logs is created.
  if to_regclass('public.logs') is not null then
    alter table public.logs drop constraint if exists logs_habit_id_fkey;
  end if;

  -- Column ORDER matters here, so the shape check reads conkey in its own
  -- ordinal order rather than alphabetically. Sorting by name would report
  -- (id, user_id) and (user_id, id) identically, and certify as correct a key
  -- whose leading column is `id` — useless to every RLS policy below, all of
  -- which filter on user_id first.
  select string_agg(a.attname, ',' order by k.ord)
    into pk_cols
  from pg_constraint c
  join unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'public.habits'::regclass and c.contype = 'p';

  if pk_cols is distinct from 'user_id,id' then
    alter table public.habits drop constraint if exists habits_pkey;
    alter table public.habits add constraint habits_pkey primary key (user_id, id);
  end if;
end $$;

create table if not exists public.logs (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id text not null,
  date text not null,
  value jsonb not null,
  note text,
  is_grace_day boolean not null default false,
  is_freeze boolean not null default false,
  created_at text not null,
  constraint logs_pkey primary key (user_id, id),
  constraint logs_user_habit_date_key unique (user_id, habit_id, date),
  constraint logs_user_id_habit_id_fkey foreign key (user_id, habit_id)
    references public.habits (user_id, id) on delete cascade
);
-- The unique constraint backs SupabaseHabitRepository.logValue's upsert
-- (on conflict (user_id, habit_id, date)).
--
-- For rows this application writes, that constraint and the (user_id, id)
-- primary key identify the same row, because logValue derives the id as
-- `${habitId}_${date}`. Note this is an application invariant, NOT a database
-- one: nothing here forces id to agree with (habit_id, date), so a hand-built
-- or bulk write may conflict on the declared arbiter while colliding with a
-- DIFFERENT row's primary key. That is tenant-local — it cannot reach another
-- user's rows — but it is why the equivalence is stated as a property of the
-- writer rather than of the schema.

-- Migration for a project created before the tenancy fix, where `create table
-- if not exists` above is a no-op.
--
-- Shape-checked rather than dropped-and-re-added, so a re-run is a genuine
-- no-op instead of churning constraints other objects may depend on.
do $$
declare
  pk_cols text;
  ghost_count bigint;
begin
  -- The pre-fix single-column FK, if it is still there. Dropping it first is
  -- safe: nothing references a foreign key.
  alter table public.logs drop constraint if exists logs_habit_id_fkey;

  -- Primary key: (user_id, id), replacing a globally primary (id). Read in
  -- conkey ordinal order — an alphabetical aggregate cannot tell (user_id, id)
  -- from (id, user_id), and would certify a key with the wrong leading column.
  select string_agg(a.attname, ',' order by k.ord)
    into pk_cols
  from pg_constraint c
  join unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'public.logs'::regclass and c.contype = 'p';

  if pk_cols is distinct from 'user_id,id' then
    alter table public.logs drop constraint if exists logs_pkey;
    alter table public.logs add constraint logs_pkey primary key (user_id, id);
  end if;

  -- Composite FK: only added when absent, never dropped while present.
  --
  -- Added NOT VALID deliberately. The pre-fix schema PERMITTED exactly the rows
  -- this constraint forbids — a log whose user_id is not the owner of the habit
  -- its habit_id points at. On a database where the vulnerability was actually
  -- exercised, an immediately-validated FK would abort here and leave the whole
  -- file unapplied, so the migration would converge only from a database that
  -- never had the bug. NOT VALID governs every NEW write immediately while
  -- tolerating the legacy rows for the few statements it takes to remove them.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.logs'::regclass
      and conname = 'logs_user_id_habit_id_fkey'
  ) then
    alter table public.logs add constraint logs_user_id_habit_id_fkey
      foreign key (user_id, habit_id) references public.habits (user_id, id)
      on delete cascade not valid;
  end if;

  -- POLICY FOR LEGACY GHOST LOGS: delete them.
  --
  -- These are logs whose (user_id, habit_id) pair matches no habit. Under the
  -- corrected schema the pair is unrepresentable, and under the old one it
  -- could only be produced by the cross-tenant insert this migration exists to
  -- close: a log one user attached to another user's habit. Such a row is not
  -- salvageable data — it belongs to a habit its owner cannot see, is invisible
  -- to the habit's owner under RLS, and carries a value for a habit that was
  -- never the writer's. There is no owner to reassign it to and no schedule it
  -- means anything against, so preserving it would only carry the exploit's
  -- residue forward. Legitimate same-owner logs match a habit and are untouched.
  delete from public.logs l
  where not exists (
    select 1 from public.habits h
    where h.user_id = l.user_id and h.id = l.habit_id
  );
  get diagnostics ghost_count = row_count;
  if ghost_count > 0 then
    raise notice 'tenancy migration: removed % cross-tenant ghost log(s)', ghost_count;
  end if;

  -- Promote the constraint to fully validated now that no violating row can
  -- remain. VALIDATE on an already-valid constraint is a no-op, so a re-run
  -- costs nothing and the end state is always a validated FK — never one left
  -- permanently NOT VALID, which would silently stop enforcing on existing rows.
  alter table public.logs validate constraint logs_user_id_habit_id_fkey;
end $$;

-- Also serves the composite FK's lookup side.
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

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

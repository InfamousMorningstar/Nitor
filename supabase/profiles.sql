-- Nitor profiles: one row per auth user. Created automatically on signup by
-- the trigger below. Phase 2 slice 1 (identity & session).
--
-- Why a table instead of user_metadata: user_metadata is writable by the
-- authenticated user from the client, so it can never back a trust decision
-- such as onboarding_completed (S5).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Deny-by-default: only the two policies below open anything up. There is
-- deliberately no insert policy (the trigger owns creation) and no delete
-- policy (delete cascades from auth.users).
--
-- `(select auth.uid())` rather than bare `auth.uid()` so the planner
-- evaluates it once per statement as an initPlan instead of once per row.

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- security definer so it can insert into a table the new user cannot yet see.
-- `set search_path = ''` is mandatory: a definer function with a mutable
-- search path lets a caller shadow an unqualified name and run code as the
-- function owner. Every reference below is therefore fully qualified (S7).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- raw_user_meta_data is user-controlled input. Safe as a display string
    -- (React escapes on render); never used for authorization. Length-capped.
    left(new.raw_user_meta_data ->> 'display_name', 60)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

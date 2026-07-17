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
--
-- `create policy` has no `if not exists` form, so each policy is dropped
-- first. Without this the whole file aborts on a re-run (42710) — and an
-- edited function body below would then never be applied.

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- The policy above scopes updates to your own ROW; these grants scope them to
-- the two columns the app actually writes. Supabase's default grants give
-- authenticated UPDATE on every column, which would let a user rewrite their
-- own created_at — not a trust input today, but honest metadata should stay
-- honest. (id is additionally pinned by the with-check; RLS already blocks
-- anon entirely.)
revoke update on table public.profiles from anon, authenticated;
grant update (display_name, onboarding_completed)
  on table public.profiles to authenticated;

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

-- Postgres grants EXECUTE to PUBLIC on every new function, so PostgREST would
-- expose this definer function at /rest/v1/rpc/handle_new_user to anon and
-- authenticated. A direct call is refused by Postgres anyway ("trigger
-- functions can only be called as triggers", 0A000), but the grant is revoked
-- so the advisor stays clean and no future definer function inherits it by
-- default. The trigger still fires: EXECUTE is checked when the trigger is
-- created, not each time it runs.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

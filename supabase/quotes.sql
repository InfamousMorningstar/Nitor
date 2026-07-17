-- Nitor quotes table: optional Supabase top-up for the bundled quote pool.
-- Run once against a provisioned Supabase project (SQL editor or `supabase db push`).
-- After running this, set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
-- and SUPABASE_SERVICE_ROLE_KEY, then seed with `npx tsx scripts/seed-quotes.ts`.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null,
  source text not null,
  tradition text not null check (tradition in ('stoic', 'science', 'wisdom', 'craft')),
  themes text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint quotes_text_key unique (text)
);
-- The unique constraint on `text` is what makes scripts/seed-quotes.ts's
-- upsert (on_conflict=text) idempotent across repeated runs.

alter table public.quotes enable row level security;

-- `create policy` has no `if not exists` form, so the policy is dropped first.
-- Without this the file aborts on a re-run (42710).
drop policy if exists "public read" on public.quotes;

create policy "public read" on public.quotes for select using (true);

grant select on public.quotes to anon;

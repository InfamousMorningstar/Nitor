# Nitor

**Habits, made visible.** A desktop-first habit-tracker web app with a matte editorial
aesthetic, a forgiving streak/momentum model (no streak-anxiety), and insights that explain *why*
you succeed — not just whether. Brand: *nitor* is Latin for brightness / radiance / striving.
Tagline: **Show up. Glow.**

> **Phase 2 — identity and persistence are live.** Auth is real Supabase GoTrue (no stub sign-in),
> and authenticated habits and logs persist to Postgres behind row-level security. The signed-out
> landing demo still uses the seeded in-memory repository behind the same `HabitRepository` seam.
>
> The Nix companion is **deferred**, not cancelled: `/pet` is an honest "Coming soon" page and the
> marketing surfaces no longer show the creature. The component, store and page are kept for a
> future phase.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest unit/component suite
npm run build    # production build
```

Requires Node ≥ 20.9. The app lives at the **repository root** (Next.js 16, App Router).

### Environment

Auth and persistence need a Supabase project. Copy the values into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SECRET_KEY=<service-role key>     # server-only — never NEXT_PUBLIC_
```

`SUPABASE_SECRET_KEY` bypasses row-level security. It is read only inside server-side route
handlers (`src/lib/supabase/admin.ts` constructs its client per call, never at module scope) and
must never reach a client bundle, a `NEXT_PUBLIC_` variable, or a log line.

Schema lives in `supabase/*.sql` and is applied by hand (SQL editor or `apply_migration`); each
file is written to be re-runnable. Verify tenancy against the live project with:

```bash
npx tsx --env-file=.env.local scripts/verify-rls.ts
```

### Signing in
Real Supabase auth — email/password with an emailed confirmation link. There is no stub sign-in
and no OAuth provider configured (the live project reports `external.google: false`; its absence
is deliberate).

## Deploy on Vercel
1. Import the repo in Vercel. **Root Directory: `./`** (the app is at the repo root).
2. Framework preset: **Next.js**.
3. Set the three environment variables above. `SUPABASE_SECRET_KEY` must be server-scoped.
4. Deploy.

## What's inside
- **Marketing landing** (`/`) — hero + GSAP scroll story + kinetic NITOЯ footer.
- **App** — Today (checklist), Habits (5-type builder), Stats (GitHub-style heatmap), Insights
  (worded correlations, streak-risk, stacking, monthly recap), Settings, and a deferred `/pet`.
- **Auth** — login / signup / forgot-password + a 3-step onboarding, gated at authentication.
- **Account** — permanent account deletion via `DELETE /api/account`, which reads the subject from
  verified claims only and confirms the delete actually happened before reporting success.
- **Design system** — see [`DESIGN.md`](./DESIGN.md): matte tokens, the NITOЯ wordmark (mirrored Я),
  Space Grotesk / Geist / JetBrains Mono, one amber accent, restrained glitch (4 sanctioned uses).

## Architecture
- Domain logic (`src/domain/`) — types, dates, forgiving streak/momentum engine, insights, stats —
  is framework-free and unit-tested.
- All data flows through `HabitRepository` (`src/data/repository.ts`). Signed-in users get
  `SupabaseHabitRepository`; the signed-out demo gets `MockHabitRepository`. Selection lives in
  `src/data/repositorySelection.ts`.
- **Tenancy is structural, not app-enforced.** `habits` and `logs` are both keyed `(user_id, id)`,
  and `logs` references habits by a *composite* FK `(user_id, habit_id) → habits(user_id, id)`.
  Postgres validates FKs with RLS bypassed, so a single-column reference was a cross-tenant hole.
  The client never sends `user_id`; it defaults to `auth.uid()` and is pinned by the RLS insert
  with-check. Browser-side filters are not a security boundary.
- Authorization always uses `getClaims()` (or `getUser()`), **never** `getSession()` — that reads
  cookie storage shared with the client and is not revalidated.
- Middleware is `src/proxy.ts` (a Next 16 file convention, *not* the repo root) and matches public
  paths against an exact `Set`, not a prefix.
- The 3D pet is a procedural placeholder (`src/components/pet/NixCreature.tsx`) with a clean slot for
  a Spline scene / rigged `.glb`. Deferred — kept, not wired into marketing.

Project status and roadmap: [`PROGRESS.md`](./PROGRESS.md).

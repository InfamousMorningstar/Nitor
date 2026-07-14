# Nitor

**Habits, made visible.** A desktop-first habit-tracker web app with a matte editorial
aesthetic, a forgiving streak/momentum model (no streak-anxiety), a bioluminescent companion
(Nix) whose glow *is* your consistency, and insights that explain *why* you succeed — not just
whether. Brand: *nitor* is Latin for brightness / radiance / striving. Tagline: **Show up. Glow.**

> This is a **front-end-first prototype**. The whole experience runs on in-memory / `localStorage`
> mock data behind a `HabitRepository` interface; auth is **stubbed** (any email + password logs in).
> A Supabase backend (auth + Postgres + RLS) drops in behind the same interface later.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest unit/component suite
npm run build    # production build
```

Requires Node ≥ 20.9. The app lives at the **repository root** (Next.js 16, App Router).

### Signing in (stubbed prototype)
Auth is not wired to a backend yet — **any email and password work** and just enter the app.
Try `you@example.com` / `password`, or click any OAuth / "Start free" button, or go straight to
`/today`.

## Deploy on Vercel
1. Import the repo in Vercel. **Root Directory: `./`** (the app is at the repo root).
2. Framework preset: **Next.js**. No environment variables needed for the prototype.
3. Deploy — the preview URL is a shareable demo.

## What's inside
- **Marketing landing** (`/`) — hero + GSAP scroll story + kinetic NITOЯ footer.
- **App** — Today (checklist), Habits (5-type builder), Stats (GitHub-style heatmap), Insights
  (worded correlations, streak-risk, stacking, monthly recap), Pet (Nix), Settings.
- **Auth** — login / signup / forgot-password + a 3-step onboarding.
- **Design system** — see [`DESIGN.md`](./DESIGN.md): matte tokens, the NITOЯ wordmark (mirrored Я),
  Space Grotesk / Geist / JetBrains Mono, one amber accent, restrained glitch (4 sanctioned uses).

## Architecture
- Domain logic (`src/domain/`) — types, dates, forgiving streak/momentum engine, insights, stats —
  is framework-free and unit-tested.
- All data flows through `HabitRepository` (`src/data/repository.ts`); today a `MockHabitRepository`,
  tomorrow a Supabase one behind the same interface.
- The 3D pet is a procedural placeholder (`src/components/pet/NixCreature.tsx`) with a clean slot for
  a Spline scene / rigged `.glb`.

Project status and roadmap: [`PROGRESS.md`](./PROGRESS.md).

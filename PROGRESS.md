# Nitor — Progress & Roadmap

Redesign of Nitor into a matte, editorial, premium habit tracker (the glassmorphism build was
rejected). Front-end-first prototype; auth stubbed; Supabase wired later behind `HabitRepository`.

**Branch:** `main` is now the active baseline — the redesign was promoted onto it (the old
glassmorphism build is gone from `main`; `feat/redesign` remains only as history).
**Status:** entire page surface built + streak-freeze, advanced habit management, and fresh-quotes
(Supabase top-up) shipped. 115 tests passing, clean production build.

_Last updated: 2026-07-15._

---

## ✅ Done

### Foundation & system
- Matte design tokens (dark default + warm-paper light), one **amber** accent, grayscale ramp.
- **NITOЯ** wordmark with the permanent mirrored **Я** (nav, loader, footer, 404).
- Type system: Space Grotesk (display) · Geist Sans (body) · JetBrains Mono (numbers).
- Motion system (150/250/400ms, one easing) + restrained **glitch** primitive.
- Glassmorphism fully removed (zero `backdrop-filter` / glow-behind-card).
- Repo restructured: the Next.js app now lives at the **repository root** (was in `nitor/`).

### App shell
- Flat glass-free left **sidebar** (6 destinations), amber active rule, nav-hover glitch.
- Mobile bottom bar, **⌘K command palette**, top bar with day-progress hairline + pet mood chip.

### Pages
- **Today** — single-column checklist, per-type controls (all 5 types loggable), daily
  authentic-quote card (Times New Roman), feed-the-pet loop, Done-today group.
- **Habits** — 5-type builder in a side **drawer** (Boolean/Count/Duration/Quantified/Quit),
  5 schedules (Daily/Weekdays/N×week/Every-N-days/Monthly), **emoji filter by name**, templates
  gallery, per-habit color as a 3px left edge, archive + typed-confirm delete. Add button is
  theme-aware.
- **Stats** — GitHub-style year **heatmap** (sequential amber ramp), momentum line + goal, weekday
  rhythm bars, per-habit sparkrows, range switcher. Custom matte SVG (no chart lib).
- **Insights** — weekly **story** lede, **worded** correlations (no raw `r`, gated by significance),
  **streak-risk** alert, **habit-stacking** suggestion, shareable **monthly recap** (wordmark).
- **Pet (Nix)** — glow = 7-day completion rate, no-guilt principle, deliberate Feed, evolution
  track (Egg→Hatchling→Juvenile→Radiant), cosmetic wardrobe, memory log. *Procedural placeholder
  creature.*
- **Settings** — grouped + searchable: account (stub), appearance (theme / 5 accents / density /
  reduce-motion), habits & streaks (week-start, day-rollover, streak-freeze toggle, vacation mode),
  notifications (stub prefs), quotes (traditions), pet (rename), data (**export JSON + CSV**).
- **Auth** — login / signup (password-strength bar) / forgot-password, split layout with Nix + a
  rotating quote, OAuth **stubs**; **3-step onboarding** (pick habits → reminder window → name pet).
- **Landing** (`/`) — hero (headline + Nix + **Start free / Log in** paired CTAs), scroll story
  with **cursor + scroll parallax** and on-entry reveals, Why-Nitor strip, kinetic **NITOЯ**
  footer. Quiet editorial top nav = wordmark + **liquid light/dark switch** (gooey metaball, now
  flanked by sun/moon icons that brighten on the active side).
- **Footer maker's seal** — the **Ahmad coat-of-arms** (`/crest.png` full; `/crest-seal.png` the
  helm+shield emblem crop) on a fixed dark chip beside the "Designed & Engineered by Salman Ahmad"
  attribution → portfolio.ahmxd.net. Verified legible on both themes.
- **Loader** (≤2s glitch intro → mirrored Я, skippable, reduced-motion fallback) + on-brand **404**.

### Streak-freeze, advanced habit management, fresh quotes _(2026-07-15)_
- **Streak-freeze** — per-habit **earned** freeze (1 per 7 completed scheduled days, bank max 2),
  **ask-first** spend on Today that bridges a single isolated miss; separate from grace days.
  `isFreeze` bridges a gap in `computeStreak` and is honored in insights, stats, CSV export, pet.
- **Advanced habit management** — habit **detail drawer** (Overview mini-heatmap + streak + freeze
  bank / Edit / **History back-date editor for the last 7 days**), **drag + keyboard reorder**
  (`Habit.order`), retired the stale `/habits/[id]` route.
- **Quotes** — verified pool grown 12 → **58** (every one a checkable primary source), date-rotation
  now draws bundled ∪ remote, and a **Supabase** top-up (`public.quotes`, RLS select-only) merges
  fresh verified quotes every 14 days — **degrades to the bundled pool until Supabase is
  provisioned** (schema `supabase/quotes.sql` + `scripts/seed-quotes.ts` ready to run).
- User-facing **`docs/features/how-it-works.md`** + a landing **"How it works"** strip under the hero.

### Domain / tests
- 5 habit types + everyNDays/monthly schedules + freeze/order/back-date engines. 115 tests (streaks,
  freezes, insights, stats, quotes, habit order, back-date, emoji search, components).

---

## ⬜ Left to do

1. **Provision Supabase for quotes** — create the project, run `supabase/quotes.sql`, set
   `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY` for
   seeding), then `npx tsx scripts/seed-quotes.ts`. Needs the Supabase connector authorized
   (interactive session). Until then the app runs on the 58 bundled quotes. Grow the pool toward
   150–300 over time via the top-up.
2. **Habit Edit tab depth** — the drawer Edit tab preserves but can't yet CHANGE
   strictness / grace-days-per-week / category (HabitForm has no true edit mode). Add real edit-mode
   support so those forgiveness knobs are editable.
3. **Favicon** = mirrored Я (still the default Next.js `favicon.ico`); focused **a11y audit**
   (keyboard, AA contrast, chart aria + table fallbacks, drawer focus traps; add
   `role="tabpanel"`/`aria-controls` to the habit-detail tabs). _Crest seal: done._
4. **3D pet asset** — awaiting a **Spline scene URL or rigged `.glb`** (states
   `idle/eat/happy/sleepy/evolve`) to replace the placeholder in `NixCreature` + the landing hero.
5. **Backend (Phase 2)** — Supabase auth (OAuth) + Postgres + RLS behind the existing
   `HabitRepository`; real notifications delivery; import-merge.

---

## Notes
- Auth is stubbed: any email + password enters the app (see README).
- `main` is the live baseline (redesign promoted). `feat/redesign` is kept only as history and can
  be deleted once nothing else references it.
- `public/` still carries the default Next.js starter SVGs (`next.svg`, `vercel.svg`, `file.svg`,
  `globe.svg`, `window.svg`) — safe to delete in a cleanup pass.

# Nitor — Progress & Roadmap

Redesign of Nitor into a matte, editorial, premium habit tracker (the glassmorphism build was
rejected). Front-end-first prototype; auth stubbed; Supabase wired later behind `HabitRepository`.

**Branch:** `main` is now the active baseline — the redesign was promoted onto it (the old
glassmorphism build is gone from `main`; `feat/redesign` remains only as history).
**Status:** entire page surface built. 96 tests passing, clean production build.

_Last updated: 2026-07-14._

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

### Domain / tests
- 5 habit types + everyNDays/monthly schedules in the engine. 96 tests (streaks, insights, stats,
  quotes, emoji search, components).

---

## ⬜ Left to do

1. **Streak-freeze mechanic** — Settings toggle exists; still need the engine logic (earn 1 per 7
   perfect days, bank max 2, auto-apply to bridge a single miss).
2. **Advanced habit management** — drag-to-reorder; per-habit **detail view** (own heatmap, streak
   history, **log-editor to fix check-ins up to 7 days back**); inline edit.
3. **Quotes** — expand from ~12 to **150–300** with verified primary sources; honor the Settings
   traditions filter. (Authenticity is a hard requirement.)
4. **Favicon** = mirrored Я (still the default Next.js `favicon.ico`); focused **a11y audit**
   (keyboard, AA contrast, chart aria + table fallbacks, drawer focus traps). _Crest seal: done._
5. **3D pet asset** — awaiting a **Spline scene URL or rigged `.glb`** (states
   `idle/eat/happy/sleepy/evolve`) to replace the placeholder in `NixCreature` + the landing hero.
6. **Backend (Phase 2)** — Supabase auth (OAuth) + Postgres + RLS behind the existing
   `HabitRepository`; real notifications delivery; import-merge.

---

## Notes
- Auth is stubbed: any email + password enters the app (see README).
- `main` is the live baseline (redesign promoted). `feat/redesign` is kept only as history and can
  be deleted once nothing else references it.
- `public/` still carries the default Next.js starter SVGs (`next.svg`, `vercel.svg`, `file.svg`,
  `globe.svg`, `window.svg`) — safe to delete in a cleanup pass.

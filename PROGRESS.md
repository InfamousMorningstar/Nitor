# Nitor — Progress & Roadmap

Redesign of Nitor into a matte, editorial, premium habit tracker (the glassmorphism build was
rejected). Front-end-first prototype; auth stubbed; Supabase wired later behind `HabitRepository`.

**Branch:** `main` is the baseline. Active work is on `feat/phase2-identity` (pushed, not merged).
**Status:** front-end prototype ~90% and feature-complete. Phase 2 (the backend) is underway —
slice 1 of 5 is 7/19 tasks in. 137 tests passing, clean production build.

_Last updated: 2026-07-16._

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

## 🚧 In progress — Phase 2, Slice 1: Identity & Session

Branch `feat/phase2-identity` (pushed, 137 tests). Spec + 19-task plan:
`docs/superpowers/specs/2026-07-16-phase2-identity-session-design.md` ·
`docs/superpowers/plans/2026-07-16-phase2-identity-session.md`

Phase 2 is cut into five slices; slice 1 comes first because RLS policies need `auth.uid()` to
exist. **Slice 1 must not deploy on its own** — auth would be real over fake in-memory data, and
the beta notice's "your data is safe" is untrue until slice 2.

**Done (reviewed):** deps + env scaffolding · `profiles.sql` (table, RLS, `security definer`
trigger) · `safeNext` open-redirect guard · password minimum 12 (server parity) · Supabase
browser/server client factories · `src/proxy.ts` route guard + session refresh · Turnstile widget.

**Left:**

1. **Provision Supabase** — create the project, enable **asymmetric JWT signing keys**, create
   **publishable + secret** keys (not legacy `anon`/`service_role`), run `supabase/profiles.sql`
   then `supabase/quotes.sql`, then `npx tsx scripts/seed-quotes.ts`. This blocks every runtime
   gate: advisors, the negative RLS test, the live redirect check, end-to-end, and the quote
   top-up are all still unrun.
2. **Task 17 before trusting quotes** — `src/data/quotes/remote.ts` still reads `ANON_KEY` and
   sends `Authorization: Bearer`, which publishable keys reject. It fails *closed* to the bundled
   58 and looks perfectly healthy while broken.
3. **Tasks 8, 10–16** — auth route handlers; real Google OAuth (Apple + GitHub stubs deleted);
   real signup / login / reset (the fake magic-link flow gets deleted); session context +
   sign-out; real user in sidebar; onboarding gating.
4. **Task 18 — dashboard config.** SMTP half is **blocked until a domain is registered** (DNS
   verification). Until then the built-in SMTP sends a few emails/hour: fine for dev, not shippable.
5. **Task 19** — verification sweep.

## ⬜ Left to do — after slice 1

1. **Phase 2 slices 2–5**, each needing its own brainstorm → spec → plan: **persistence & RLS**
   (`user_id` on the domain, schema, `SupabaseHabitRepository` behind the existing
   `HabitRepository` seam — the dominant chunk); settings/pet sync (optional); notifications
   delivery; import-merge.
2. **Habit Edit tab depth** — the drawer Edit tab preserves but can't yet CHANGE
   strictness / grace-days-per-week / category (HabitForm has no true edit mode).
3. **Favicon** = mirrored Я (still the default Next.js `favicon.ico`); focused **a11y audit**
   (keyboard, AA contrast, chart aria + table fallbacks, drawer focus traps; add
   `role="tabpanel"`/`aria-controls` to the habit-detail tabs). _Crest seal: done._
4. **3D pet asset** — awaiting a **Spline scene URL or rigged `.glb`** (states
   `idle/eat/happy/sleepy/evolve`) to replace the placeholder in `NixCreature` + the landing hero.

## ⚠️ Gotchas worth not relearning

Five defects were caught on the slice-1 branch before shipping, and **every one was invisible to
`tsc`, lint, and the test suite**:

- **`src/proxy.ts`, not the repo root.** Next resolves the proxy by scanning
  `path.join(appDir, '..')` — which is `src/` here. A repo-root `proxy.ts` builds clean, warns
  nothing, and the guard never runs. The gate that catches it:
  `npm run build | grep Proxy` must print `ƒ Proxy (Middleware)`.
- **`getClaims()`, never `getSession()`** in server code.
- **`setAll` takes `(cookies, headers)`** in `@supabase/ssr` 0.12.3, and the proxy is the *only*
  place those cache headers can land — otherwise a CDN can serve one user's session to another.
- **`safeNext`'s output must reach the redirect verbatim** — never `decodeURIComponent` it.
- **Turnstile callbacks must stay behind refs** — inline arrows tore the widget down on every
  keystroke and discarded the solved token.

---

## Notes
- Auth is stubbed: any email + password enters the app (see README).
- `main` is the live baseline (redesign promoted). `feat/redesign` is kept only as history and can
  be deleted once nothing else references it.
- `public/` still carries the default Next.js starter SVGs (`next.svg`, `vercel.svg`, `file.svg`,
  `globe.svg`, `window.svg`) — safe to delete in a cleanup pass.

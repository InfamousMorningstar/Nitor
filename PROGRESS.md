# Nitor — Progress & Roadmap

Redesign of Nitor into a matte, editorial, premium habit tracker (the glassmorphism build was
rejected). Auth is live; authenticated habit and log persistence now runs through Supabase behind
the frozen `HabitRepository` seam.

**Branch:** `main` is the baseline. Active work is on `feat/phase2-identity` (pushed, not merged).
**Status:** Phase 2 is underway. Identity/session is 16/19 tasks in; the Slice 2 persistence
implementation is integrated behind RLS, with habit and log ownership enforced structurally
(tenant-qualified keys plus a composite foreign key) rather than by application code. 362 tests
pass across 42 files; TypeScript and the 24-page production build are clean.

_Last updated: 2026-07-18._

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
- **Pet** — `/pet` is back to an honest **Coming soon** state while the full Nix companion is
  deferred to a future phase.
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
- **Public footer pages** — real `/features`, `/pricing`, `/changelog`, `/roadmap`, `/privacy`,
  `/terms`, and `/security` routes replace every placeholder footer link. Public copy uses a
  solo-developer or neutral product voice.

### Streak-freeze, advanced habit management, fresh quotes _(2026-07-15)_
- **Streak-freeze** — per-habit **earned** freeze (1 per 7 completed scheduled days, bank max 2),
  **ask-first** spend on Today that bridges a single isolated miss; separate from grace days.
  `isFreeze` bridges a gap in `computeStreak` and is honored in insights, stats, CSV export, pet.
- **Advanced habit management** — habit **detail drawer** (Overview mini-heatmap + streak + freeze
  bank / Edit / **History back-date editor for the last 7 days**), **drag + keyboard reorder**
  (`Habit.order`), retired the stale `/habits/[id]` route.
- **Quotes** — verified pool grown 12 → **58** (every one a checkable primary source), date-rotation
  now draws bundled ∪ remote, and a **Supabase** top-up (`public.quotes`, RLS select-only) merges
  fresh verified quotes every 14 days — **degrades to the bundled pool when the remote is
  unavailable** (schema `supabase/quotes.sql` + `scripts/seed-quotes.ts`).
- User-facing **`docs/features/how-it-works.md`** + a landing **"How it works"** strip under the hero.

### Domain / tests
- 5 habit types + everyNDays/monthly schedules + freeze/order/back-date engines. 271 tests across
  40 files cover domain behavior, persistence mapping, auth, route guards, public pages,
  accessibility, and components.

### Accessibility & polish _(2026-07-17)_
- Focused keyboard/AT pass: shared modal focus trap + trigger restoration for the habit drawers,
  command palette, and typed-confirm delete; Escape closes each; habit-detail tabs implement the
  ARIA tab pattern with arrow/Home/End navigation.
- Stats SVGs have accessible names, visible keyboard focus, and screen-reader tables for the
  heatmap, momentum, weekday rhythm, and per-habit sparkrows.
- Dark/light contrast tokens meet AA for normal text and amber actions; habit mutations announce
  save/archive/delete/reorder status through a polite live region.
- Brand mirrored-**R** App Router icon replaces the starter favicon. Unreferenced Next.js starter
  SVGs removed from `public/`.
- Habit builder/edit depth now includes category, strictness, and 0–7 grace days per week; the
  detail drawer edits those fields while preserving habit identity, archive state, and order.

---

## 🚧 In progress — Phase 2: Identity, Session & Persistence

Branch `feat/phase2-identity` (pushed, 271 tests). Identity spec + 19-task plan:
`docs/superpowers/specs/2026-07-16-phase2-identity-session-design.md` ·
`docs/superpowers/plans/2026-07-16-phase2-identity-session.md`

Phase 2 is cut into five slices; slice 1 comes first because RLS policies need `auth.uid()` to
exist. **Slice 1 must not deploy on its own** — auth would be real over fake in-memory data, and
the beta notice's "your data is safe" is untrue until slice 2.

**Done (reviewed):** Supabase project provisioned + schemas/quote seed · deps + env scaffolding ·
`profiles.sql` (table, RLS, `security definer` trigger) · `safeNext` open-redirect guard · password
minimum 12 (server parity) · Supabase browser/server client factories · `src/proxy.ts` route guard
+ session refresh · auth callback/confirmation handlers · Turnstile widget · real signup/login/
password reset · session context + sign-out · real user in sidebar · onboarding gating · quote
top-up migrated to the publishable key.

**Slice 2 persistence (integrated):** `habits` + `logs` schema with server-owned `user_id` and
deny-by-default RLS · authenticated provider selection · browser-client
`SupabaseHabitRepository` · faithful schedule/type/strictness/grace/order/target/unit/date and
boolean-or-numeric log round-trips · cascade deletion · 4 focused repository contract tests.
Supabase security advisors report zero findings, and all four public tables (`profiles`, `quotes`,
`habits`, `logs`) are confirmed RLS-enabled.

**Slice 2 runtime-proved _(2026-07-18)_:** `scripts/verify-rls.ts` prints `VERIFY-RLS: PASS`
(13 checks) against the live project — field fidelity, cross-user read/PATCH/DELETE isolation,
forged-`user_id` rejection on INSERT and UPDATE, and anon lockout. Every negative check is paired
with a positive control (user B holds its own rows), and the script was mutation-tested: handing B
user A's JWT fails it. End-to-end browser run signed in as a real user, created 3 habits, logged
one, edited it, archived one, deleted another, hard-reloaded, and confirmed the surviving state
came from Postgres and not the seeded mock; cascade delete drops a habit's logs. Tables returned
to 0 rows after cleanup.

**Left:**

1. **Task 10 — real Google OAuth. BLOCKED, verified 2026-07-18.** The Apple + GitHub stubs are
   gone, and no `signInWithOAuth({ provider: "google" })` implementation exists in `src/`.
   `GET /auth/v1/settings` on the live project reports **`external.google: false`** — email is the
   only enabled provider — so a "Continue with Google" button would 400 (`provider is not
   enabled`) and strand the user. **Do not implement until** a Google Cloud OAuth client exists
   and its client ID + secret are set in Supabase → Auth → Providers → Google (authorized redirect
   URI `<supabase-url>/auth/v1/callback`). Re-check with that settings endpoint; the flag flipping
   to `true` is the green light. `/auth/callback` already does the PKCE exchange, already routes
   through `safeNext`, and already passes its output to the redirect verbatim.
2. **Task 18 — dashboard config.** SMTP half is **blocked until a domain is registered** (DNS
   verification). Until then the built-in SMTP sends a few emails/hour: fine for dev, not shippable.
3. **Task 19** — finish the remaining live/runtime gates: negative RLS, quote top-up,
   authenticated redirects, and end-to-end browser flow.

## ⬜ Left to do

1. **Finish identity/runtime gates** — Google OAuth; production SMTP after domain registration;
   live cross-user RLS, quote top-up, authenticated redirects, and full signed-in browser flow.
2. **Phase 2 slices 3–5**, each needing its own brainstorm → spec → plan: settings sync,
   notifications delivery, and import-merge.
3. **Full Nix companion** — future roadmap work covering pet persistence, feed/evolution,
   wardrobe, memory, and the final production asset. The visual asset still needs a Spline scene
   URL or rigged `.glb` with `idle/eat/happy/sleepy/evolve` states.

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
- Authenticated habit/log data uses Supabase; the signed-out demo still uses the seeded in-memory
  repository. Settings remain local, and the full pet system is deferred.
- `main` is the live baseline (redesign promoted). `feat/redesign` is kept only as history and can
  be deleted once nothing else references it.
- The default Next.js starter SVGs were confirmed unreferenced and removed from `public/`.

# Nitor — Progress & Roadmap

Redesign of Nitor into a matte, editorial, premium habit tracker (the glassmorphism build was
rejected). Auth is live; authenticated habit and log persistence now runs through Supabase behind
the frozen `HabitRepository` seam.

**Branch:** `main` is the baseline and is deployed. `fix/login-onboarding-gate` holds 6 commits,
pushed and awaiting merge.
**Status:** **Nitor is live in CLOSED BETA at https://nitor-peach.vercel.app.** Phase 2 identity is
16/19 tasks in; Slice 2 persistence runs behind RLS, with habit and log ownership enforced
structurally (tenant-qualified keys plus a composite foreign key) rather than by application code.
**424 tests pass across 47 files**; TypeScript is clean and the production build is clean at **25
static pages** and still prints `ƒ Proxy (Middleware)`. Login was driven end to end in a real
browser against the deployed site, not only under mocks.

_Last updated: 2026-07-20._

---

## 🔴 BLOCKED ON A DOMAIN — the only thing between closed and public beta

**These are human/dashboard steps. No amount of code moves them.** A domain is being registered
(expected on or shortly after 2026-07-21); everything below unblocks in the same sweep.

| # | Step | Where | Unblocks |
|---|------|-------|----------|
| 1 | Register the domain | registrar | everything below |
| 2 | Point it at the Vercel project + verify DNS | Vercel → Domains | real URL instead of `nitor-peach.vercel.app` |
| 3 | Configure **custom SMTP** (Resend/Postmark/SES) | Supabase → Auth → SMTP | **self sign-up, password reset, email change** |
| 4 | Re-point Site URL + Redirect URLs to the domain | Supabase → Auth → URL Configuration | auth links that don't 404 |
| 5 | Add the domain to the Turnstile widget | Cloudflare → Turnstile | CAPTCHA on login/signup/forgot |
| 6 | Install the **email-change template** (below) | Supabase → Auth → Email Templates | roadmap item 5 |

**Why SMTP is the hinge:** Supabase's built-in email service only delivers to members of the
Supabase organisation, and rate-limits to a few messages an hour. An outside address that signs up
today never receives its confirmation link, so its account is unusable. That single fact is why the
product currently says *closed beta*, why `SIGNUPS_OPEN` is `false`, why the landing CTA is a
disabled button, and why beta testers are created by script instead of signing up.

### Then, and only then: the flip to public beta

Do it in this order — the copy is downstream of whether email actually sends.

1. **Observe a real signup complete** from an address that is NOT in the Supabase org. Watch the
   confirmation arrive and the account work. This is the gate; everything else is bookkeeping.
2. `SIGNUPS_OPEN = true` in `src/content/beta.ts` — one boolean, covers every self-sign-up surface.
3. `BETA_LABEL` back to `"Public Beta"`; restore open-signup wording in `BETA_HERO_NOTICE`.
4. Delete `BETA_SIGNUP_CLOSED_LINE` and its `<p>` in `src/app/(auth)/signup/page.tsx`.
5. `tests/components/SignupsClosedCta.test.tsx` pins BOTH branches, so it keeps passing — but read
   it, because it documents what "open" is supposed to look like.

**Adding beta testers until then:**

```bash
npx tsx --env-file=.env.local scripts/invite-user.ts their@email.com
```

Creates the account pre-confirmed, verifies the profile row and that sign-in actually works, then
prints a generated password. Share it over a channel you trust, not email. They can change it at
Settings → Change password.

---

## ▶️ RESUME HERE

Everything below is committed and pushed. Pick up at step 1.

**1. ✅ DONE (2026-07-20) — migration applied and verified against the live database.**
`supabase/habits.sql` (tenancy fix + CHECK constraints, commit `ddba6fd`) is applied to the live
Supabase project, and `scripts/verify-rls.ts` reports **VERIFY-RLS: PASS, 27/27 checks** against
it — including cross-tenant isolation in both directions, the composite-FK rejection of foreign
habit ids, no existence oracle, no ghost logs, and the anon role reading zero rows.

Re-run any time (the SQL file is written to be re-runnable):

```bash
npx tsx --env-file=.env.local scripts/verify-rls.ts    # expect PASS, 27 checks
```

**2. ✅ SHIPPED — password change. Email change deferred to roadmap item 5.**
Password change is live: it requires the current password before accepting a new one, and reuses
the shared strength helpers. Its `signInWithPassword` verification re-issues the session and
consumes sign-in rate limit — a known, accepted side effect, commented at the call site.
The Settings email field is **read-only**, and `EmailChangeControl` is built, tested, and
deliberately unimported. See roadmap item 5 for why and for the exact template needed.

**3. Task 3 — complete the data export.** Not started. `exportJson()` / `exportCsv()` in
`src/app/settings/page.tsx` already work. Remaining: fetch a fresh complete copy rather than
exporting whatever `useHabits` holds in memory, include profile + settings (never anything
session-derived), verify archived habits are included, add a `schemaVersion` field, and fail
loudly instead of downloading a partial file that looks complete. Import stays out of scope —
only make its copy honest if it overclaims.

**4. Known unknowns — things believed to work that have NOT been observed working.**
- **`/api/account` deletion** is proven under mocks only; the cascade has never run against a real
  auth user. `scripts/invite-user.ts` makes a throwaway account cheap, so this is now easy to close.
- **The iOS theme-toggle fix.** The gooey metaball is opt-in at ≥1024px because iOS Safari painted
  its `box-shadow` ring as an opaque slab in dark mode. Chromium renders the *broken* version
  correctly at the same 390px viewport, so emulation cannot reproduce the bug and cannot confirm
  the fix. **Verify on a real iPhone after deploy.**
- **Whether a non-org address can complete signup.** Assumed impossible (built-in SMTP); never
  actually attempted. Worth one attempt so the failure mode is known first-hand.

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
- **Settings** — grouped + searchable: account (**real, irreversible account deletion**; **password
  change** requiring the current password; email read-only pending its template), appearance (theme / 5 accents / density /
  reduce-motion), habits & streaks (week-start, day-rollover, streak-freeze toggle, vacation mode),
  notifications (stub prefs), quotes (traditions), pet (rename), data (**export JSON + CSV**).
- **Auth** — login / signup (password-strength bar) / forgot-password, split layout with Nix + a
  rotating quote, OAuth **stubs**; **3-step onboarding** (pick habits → reminder window → name pet).
- **Landing** (`/`) — hero (headline + a weekly **momentum ledger** slab + **Start free / Log in**
  paired CTAs; the pet was removed from every marketing surface once it was deferred), scroll story
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

### Closed-beta launch _(2026-07-20)_
- **Deployed.** Live at `https://nitor-peach.vercel.app` (Vercel project `nitor`, 4 env vars on
  Production + Preview). `main` is the production branch.
- **Live database.** `supabase/habits.sql` applied; `verify-rls.ts` PASS 27/27 against the real
  project, including cross-tenant isolation both directions and the anon role reading zero rows.
- **Login proven end to end in a real browser** on the deployed site — Turnstile solving, session
  established, `/today` reached. Not a mock.
- **Password change** requiring the current password. Email field read-only (roadmap item 5).
- **Fixed: password login skipped onboarding.** It pushed straight to `next` and never called
  `postAuthDestination`, so first-time users landed on an empty `/today`. Found by driving the
  deployed site — `tsc`, lint, and 416 tests all passed with the bug present.
- **Fixed: theme toggle on iOS Safari.** The gooey metaball is now opt-in at ≥1024px; the base is a
  plain switch. **Not verified on a real device — see Known unknowns.**
- **Closed beta, honestly.** Nix removed from `/login` and `/signup`; `SIGNUPS_OPEN=false` gates
  every self-sign-up surface; landing CTA is a disabled button labelled "Invite only" with no
  `/signup` anchor left on the page; signup carries "Sign-ups are closed for now — invite only."
- **`scripts/invite-user.ts`** — creates a pre-confirmed tester and proves the account can sign in.

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
2. **Task 18 — dashboard config.**
   - SMTP is **blocked until a domain is registered** (DNS verification). Until then the built-in
     SMTP sends a few emails/hour: fine for dev, not shippable.
   - Email change is **BLOCKED until this exact custom Auth → Email Templates → Change email
     address template is installed**. The default `{{ .ConfirmationURL }}` verifies inside
     Supabase and redirects without the evidence required by `/auth/confirm`.

     **Subject**

     ```text
     Confirm your Nitor email change
     ```

     **HTML**

     ```html
     <h2>Confirm your email change</h2>
     <p>Confirm the requested change to {{ .NewEmail }}.</p>
     <p>
       <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email_change">
         Confirm email change
       </a>
     </p>
     <p>If you did not request this change, you can safely ignore this email.</p>
     ```

     `updateUser` passes `/auth/confirm` as `emailRedirectTo`, so `{{ .RedirectTo }}` expands to
     the environment-correct `/auth/confirm` URL. Do not replace this with a bare-redirect fallback:
     without `token_hash` and `type`, the application has no positive evidence of confirmation.
3. **Task 19** — finish the remaining live/runtime gates: negative RLS, quote top-up,
   authenticated redirects, and end-to-end browser flow.

## ⬜ Left to do

0. **Domain → SMTP → public beta.** See the BLOCKED section at the top; it gates items 3 and 5 and
   is the only thing standing between closed and public beta.
1. **Complete the data export** — see RESUME HERE. Not blocked by anything; the best next coding
   task.
2. **Close the known unknowns** — `/api/account` against a real user, the iOS toggle on a real
   phone, and one attempted signup from a non-org address. All cheap, none blocked.
3. **Finish identity/runtime gates** — production SMTP after domain registration; live cross-user
   RLS, quote top-up, authenticated redirects, and full signed-in browser flow. (Google OAuth is
   *not* on this list: the live project reports `external.google: false` and its absence is
   deliberate.)
4. **Phase 2 slices 3–5**, each needing its own brainstorm → spec → plan: settings sync,
   notifications delivery, and import-merge.
5. **Email change — deferred to roadmap, blocked on a domain.** The `type === "email_change"`
   branch in `src/app/auth/confirm/route.ts` is written and tested, but **nothing routes to it**:
   Supabase's default "Change Email Address" template uses `{{ .ConfirmationURL }}`, which verifies
   server-side and redirects carrying **no `token_hash` and no `type`** — so the route's first guard
   sends the user to `/login?error=invalid_link` *after the change already succeeded*. A success
   that reports itself as a failure is worse than an honest placeholder, so **the Settings email
   field is read-only** and `EmailChangeControl` is intentionally left unimported — built and
   tested, but not offered. Unblocking it needs (a) a domain + custom SMTP,
   and (b) a custom template pointing at
   `/auth/confirm?token_hash={{ .TokenHash }}&type=email_change` — same dependency as Task 18.
   Also open when it resumes: Supabase "secure email change" (confirm *both* addresses) has never
   been verified against this project; `/auth/v1/settings` does not expose the flag and the
   Management API returned 401. The client code already tolerates either mode.
6. **Full Nix companion** — future roadmap work covering pet persistence, feed/evolution,
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
- **supabase-js RETURNS errors rather than throwing, and a zero-row operation is not an error.**
  Success needs positive evidence, not merely the absence of an error — `/api/account` re-reads the
  user and requires it to be *absent* before reporting a successful delete.
- **Deleting an auth user does not invalidate its already-issued access token.** The JWT stays
  signature-valid until expiry, so clearing the session cookies is what actually ends the session.
- **Two writing agents in one checkout will corrupt a test run.** A `npm test` mid-session reported
  `3 failed | 406 passed`; the three failures were a Codex test file that existed while its
  component edits were still being written. Four later runs were clean. Not a flake — a race. Give
  concurrent agents disjoint files (or a worktree), and re-run before believing a failure.

---

## Notes
- Authenticated habit/log data uses Supabase; the signed-out demo still uses the seeded in-memory
  repository. Settings remain local, and the full pet system is deferred.
- `main` is the live baseline (redesign promoted). `feat/redesign` is kept only as history and can
  be deleted once nothing else references it.
- The default Next.js starter SVGs were confirmed unreferenced and removed from `public/`.

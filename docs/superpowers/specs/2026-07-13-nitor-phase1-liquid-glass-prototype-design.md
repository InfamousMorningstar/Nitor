# Nitor — Phase 1: Liquid Glass Prototype (Design Spec)

**Date:** 2026-07-13
**Status:** Approved (brainstorming) → ready for implementation plan
**Scope:** Phase 1 only (clickable front end on mock data). Phase 2 (backend) is a separate spec.

---

## 1. Product concept

**Nitor** (Latin: *"to shine / to strive"*) is a habit tracker whose hero differentiator is
**intelligence** — it tells you *why* you succeed, not just *whether* you did. It is positioned
against the two structural weaknesses of existing trackers:

- **Streak anxiety** — the all-or-nothing streak is the #1 reason people quit after one slip.
  Nitor replaces the brittle streak with a **forgiving momentum** model that bends instead of
  shattering (grace days, repair windows, momentum that dips and recovers).
- **No "why"** — competitors (Streaks, Habitica, Habitify) show *what* you did. None credibly
  surface *why* you succeed. Nitor's **insights** get better the longer you use it, forming a
  data moat.

The intelligence engine (Phase 2) is **hybrid**: Postgres computes trustworthy correlations and
statistics deterministically; Claude turns them into a warm weekly narrative + suggestions
(~1 AI call per user per week — cost-controlled at SaaS scale).

### What Phase 1 is
A **design-first prototype**: a fully clickable Next.js front end with realistic **mock data** —
no auth, no backend, no live AI. Its purpose is to validate the Apple / iOS 26 **Liquid Glass**
aesthetic and the insight loop *before* committing the backend. Built so Phase 2 is a swap, not a
rewrite.

---

## 2. Architecture decision: Phase-2-ready prototype

The UI is built against a **typed mock data layer** that mimics the exact shape Supabase will
return in Phase 2:

- A `HabitRepository` interface defines all data access.
- Phase 1 ships `MockHabitRepository` (seeded, realistic multi-week data).
- Phase 2 adds `SupabaseHabitRepository` behind the **same interface** — no UI rewrite.

Rejected alternative: pure throwaway inline fixtures (faster to first pixel, but forces a data-layer
rewrite in Phase 2). The typed approach is barely more work and respects that this becomes a real
SaaS.

---

## 3. Screens (information architecture)

| Screen | Purpose | Key elements |
|--------|---------|--------------|
| **Today** | The 3-second daily loop | Habit cards/rings, tap-to-log for all 3 types, momentum bar (not a brittle streak) |
| **Habit detail** | One habit, in depth | Month calendar color-coded (done / missed / grace / not scheduled), current + longest streak, per-habit insights |
| **Insights** (hero) | The "why" dashboard | Correlation cards, best-time window, weekly AI-written "story" card (mocked copy in Phase 1) |
| **Habits** | Manage habits | Create/edit/archive, emoji + color picker, 3 types (duration / boolean / count), schedule |
| **Settings** | Preferences | Appearance (glass intensity, light/dark), export-data affordance, account stub |

**Cold-start handling (design principle carried into Phase 2):** simple stats appear from the first
few logs; the AI weekly "story" unlocks once there's enough signal (~2 weeks of data). Honest
"building your baseline" states fill the gap. In Phase 1 the mock data is pre-seeded with enough
history that all states look alive.

---

## 4. Liquid Glass design system (technical heart)

A single reusable `<Glass>` primitive with **tiered rendering** via runtime feature detection:

- **Tier 1 — Chromium (true refraction):** SVG `feDisplacementMap` fed into `backdrop-filter`,
  plus a specular rim highlight. This is the "real" iOS 26 effect.
- **Tier 2 — Safari / Firefox / iOS Safari (fallback):** layered
  `backdrop-filter: blur() saturate()` + specular highlight + hairline border + subtle grain.
  Looks premium; **legibility never depends on refraction.**
- **Tier 3 — reduced-motion / low-power:** static frosted glass, no displacement.

**Important constraint (from research):** the SVG-in-`backdrop-filter` combination is **Chromium-only**
— Safari and Firefox do not support it, so true refraction will *not* render on a real iPhone. The
Tier 2 fallback is therefore the baseline experience and must look excellent on its own.

**Performance rule:** apply glass sparingly — nav bar, modals, primary CTA, insight cards — never on
every element (each SVG-filter instance reserves GPU/compositing resources and can cause scroll jank).

**Aesthetic details:**
- Typography: Apple system stack (`-apple-system`, `SF Pro`) with **Inter** as the cross-platform
  fallback (SF Pro cannot be licensed/shipped as a web font).
- Motion: spring-based transitions; respect `prefers-reduced-motion`.
- Theming: full light + dark support.
- Configurable glass parameters exposed as tokens: blur radius, displacement scale, specular
  opacity/saturation, refraction level (per the researched parameter set).

---

## 5. Data model (Phase-1 mock, Phase-2-aligned)

Typed domain models mirroring the Phase 2 Postgres schema:

- `Habit` — id, name, emoji, color, category, type (`duration | boolean | count`), targetValue,
  schedule (`daily | weekdays[] | timesPerWeek`), strictness/grace fields, archived, createdAt.
- `Log` — id, habitId, date, value (minutes / count / boolean), note, isGraceDay, createdAt.
- `Streak` — current, longest, momentum (derived).
- `Insight` — type, computed stat, human-readable narrative (mocked in Phase 1).

`MockHabitRepository` seeds several habits across categories with multi-week logs so streaks,
calendar coloring, momentum, and insight cards all render with lifelike data.

---

## 6. Tech stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + CSS custom properties for glass tokens
- **Hosting:** Vercel
- **Phase 1 data:** in-memory `MockHabitRepository` (no network)
- (Phase 2, separate spec: Supabase Postgres + Auth + RLS; Claude API weekly narrative via Edge
  Function; data export.)

---

## 7. Out of scope for Phase 1

Auth · real persistence · web-push reminders · OAuth · live AI calls · custom-strictness builder ·
native mobile app. All are Phase 2 or later.

---

## 8. Success criteria for Phase 1

- Every screen in §3 is reachable and clickable with realistic mock data.
- The `<Glass>` primitive renders correctly across all three tiers (verified in Chromium and a
  non-Chromium/reduced-motion path).
- Logging any of the 3 habit types updates the UI (momentum, calendar, Today view) against the mock
  repository.
- Light and dark themes both look intentional and premium.
- The data layer is behind `HabitRepository` so Phase 2 can swap in Supabase without UI changes.
- Deploys to Vercel as a shareable demo.

---

## 9. Phase 2 preview (not built now)

Supabase (Postgres + Auth + RLS) behind the same `HabitRepository` interface; the hybrid insight
engine (SQL correlations + one weekly Claude narrative call via a Supabase Edge Function); data
export; then reminders/push, OAuth, and the custom-strictness builder as fast-follows.

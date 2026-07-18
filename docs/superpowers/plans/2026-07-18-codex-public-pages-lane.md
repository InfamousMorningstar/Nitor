# Codex Public Pages Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Codex's non-overlapping portion of the public-pages, deferred-pet, and security-evidence work while Claude creates the six new public pages and updates their public-route guard.

**Architecture:** `KineticFooter` becomes the single route map for all seven public destinations. The authenticated `/pet` route becomes a static `AppFrame` coming-soon view while existing pet implementation modules remain untouched. `/security` reports separately verified automated, browser, Claude Fable 5, and OpenAI Codex evidence; `PROGRESS.md` mirrors the resulting product state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Modify only `src/components/marketing/KineticFooter.tsx`, `src/app/pet/page.tsx`, `src/app/security/page.tsx`, `PROGRESS.md`, and new/focused tests for those files.
- Do not edit Claude-owned `/features`, `/pricing`, `/changelog`, `/roadmap`, `/privacy`, `/terms`, or proxy/public-route files.
- Preserve the matte/editorial design and existing font/token system.
- Keep existing pet domain, state, creature, marketing, onboarding, and settings modules intact.
- Use verified numbers only. Distinguish automated tests, browser checks, AI-assisted review, and independent certification.
- Do not commit, push, merge, deploy, discard changes, or run destructive git commands.

---

### Task 1: Footer Route Wiring

**Files:**
- Modify: `src/components/marketing/KineticFooter.tsx`
- Test: `tests/components/KineticFooter.links.test.tsx`

**Interfaces:**
- Consumes: Claude-owned public routes `/features`, `/pricing`, `/changelog`, `/roadmap`, `/privacy`, `/terms`, plus existing `/security`.
- Produces: seven real internal links with no `href="#"`.

- [ ] **Step 1: Write the failing footer-link test**

Render `KineticFooter`, mock animation-only dependencies where needed, and assert the exact label-to-route map:

```ts
{
  Features: "/features",
  Pricing: "/pricing",
  Changelog: "/changelog",
  Roadmap: "/roadmap",
  Privacy: "/privacy",
  Terms: "/terms",
  Security: "/security",
}
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npx.cmd vitest run tests/components/KineticFooter.links.test.tsx
```

Expected: failure because six links still resolve to `#`.

- [ ] **Step 3: Replace placeholder hrefs**

Change only the six placeholder route values in `COLUMNS`. Preserve footer layout, styling, newsletter, attribution, motion, and accessibility behavior.

- [ ] **Step 4: Run the focused test**

Expected: one focused file passes and no `href="#"` remains in the component.

### Task 2: Deferred Pet Presentation

**Files:**
- Modify: `src/app/pet/page.tsx`
- Test: `tests/app/pet-coming-soon.test.tsx`

**Interfaces:**
- Consumes: `AppFrame`.
- Produces: a static authenticated Pet route with no active pet controls.

- [ ] **Step 1: Write the failing pet-route test**

Mock `AppFrame`, render `PetPage`, and assert:

- `Companion` and `Pet` headings remain;
- visible copy includes `Coming soon`;
- feed, evolution, wardrobe, and memory controls are absent.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npx.cmd vitest run tests/app/pet-coming-soon.test.tsx
```

Expected: failure because the active pet dashboard is still rendered.

- [ ] **Step 3: Replace the page with the coming-soon state**

Keep the existing `AppFrame`, eyebrow, heading hierarchy, matte surface tokens, and a concise explanation that Nix is being refined for a later phase. Remove page-level imports and behavior for habit/log data, pet state, wardrobe, evolution, feeding, and memory. Do not delete or edit the underlying modules.

- [ ] **Step 4: Run the focused test**

Expected: one focused file passes; no active pet control appears.

### Task 3: Progress and Roadmap Truthfulness

**Files:**
- Modify: `PROGRESS.md`

**Interfaces:**
- Consumes: verified repository implementation, Claude's completed public-page handoff, and final test/build evidence.
- Produces: current persistence status and a deferred pet roadmap entry.

- [ ] **Step 1: Re-read current repository/provider/schema state**

Verify the completed Slice 2 artifacts from code rather than copying the design plan.

- [ ] **Step 2: Update pet status**

Remove the full Pet dashboard from the active/complete page list, describe `/pet` as coming soon, and add the full Nix system—persistence, production asset, feed/evolution/wardrobe/memory experience—to the future roadmap.

- [ ] **Step 3: Refresh persistence and test status**

Record only completed persistence work and fresh final test/build totals. Do not mark live RLS or browser gates complete without Claude's evidence.

### Task 4: Security Evidence Ledger and Attribution

**Files:**
- Modify: `src/app/security/page.tsx`
- Test: `tests/app/security-evidence.test.tsx`

**Interfaces:**
- Consumes: Claude's exact final automated/browser/security results and Codex's four focused repository tests.
- Produces: accurate numeric verification evidence with separate model attributions.

- [ ] **Step 1: Receive Claude's verification handoff**

Require exact Vitest file/test counts, build result, browser flows, adversarial checks, and advisor status. If evidence is absent, omit the unsupported number or retain an in-progress label.

- [ ] **Step 2: Write the failing security-evidence test**

Assert the final verified numbers and both model names appear, plus the limitation that review is not independent certification.

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```powershell
npx.cmd vitest run tests/app/security-evidence.test.tsx
```

Expected: failure because the Codex attribution and numeric evidence ledger are absent.

- [ ] **Step 4: Implement the evidence ledger**

Add compact, editorial evidence rows without redesigning the page. Include this approved wording verbatim:

> The persistence repository and its RLS boundary were independently reviewed with OpenAI Codex, including schema fidelity, ownership isolation, mutation safety, and field round-tripping.

Keep Claude Fable 5's identity/session role separate. State that neither model-assisted review is an independent human audit or certification.

- [ ] **Step 5: Run the focused test**

Expected: one focused file passes with exact evidence text.

### Task 5: Integrated Verification

**Files:**
- Test only; do not broaden implementation scope.

**Interfaces:**
- Consumes: both agents' completed working-tree changes.
- Produces: final reproducible evidence for handoff.

- [ ] **Step 1: Run focused Codex tests**

```powershell
npx.cmd vitest run tests/components/KineticFooter.links.test.tsx tests/app/pet-coming-soon.test.tsx tests/app/security-evidence.test.tsx tests/data/SupabaseHabitRepository.test.ts
```

- [ ] **Step 2: Run focused lint**

```powershell
npx.cmd eslint src/components/marketing/KineticFooter.tsx src/app/pet/page.tsx src/app/security/page.tsx tests/components/KineticFooter.links.test.tsx tests/app/pet-coming-soon.test.tsx tests/app/security-evidence.test.tsx
```

- [ ] **Step 3: Run TypeScript and full Vitest**

```powershell
npx.cmd tsc --noEmit
npm.cmd test
```

Report out-of-scope failures exactly; do not edit Claude-owned or unrelated files to hide them.

- [ ] **Step 4: Run the production build after Claude finishes**

```powershell
npm.cmd run build
```

Confirm the Proxy middleware line remains present.

- [ ] **Step 5: Final review**

Verify no ownership-boundary violations, no footer placeholders, no active pet controls, accurate roadmap language, and evidence numbers matching the final commands.


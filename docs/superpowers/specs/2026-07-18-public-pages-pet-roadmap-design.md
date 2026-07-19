# Public Pages, Pet Roadmap, and Security Evidence

_Design doc · 2026-07-18 · coordinated Claude Code + Codex work_

## Goal

Replace the landing footer's placeholder destinations with complete, honest
public pages; temporarily return the Pet route to a polished "Coming soon"
state; move the full pet system into the future roadmap; and make Nitor's
security verification page credit both Claude Fable 5 and OpenAI Codex using
reproducible numbers rather than vague claims.

## Product principles

- Preserve Nitor's matte, editorial visual language. This is content and
  navigation completion, not a redesign.
- Every footer link leads to a real route. No `href="#"` placeholders remain.
- Public copy describes only behavior that exists or is explicitly labelled
  beta, planned, or coming soon.
- AI-assisted security review is presented as evidence, not as independent
  certification or a substitute for human review.
- Test totals and runtime-check counts appear only after a fresh reproducible
  run. Do not copy stale totals from `PROGRESS.md`.
- The full pet implementation remains in the repository for future reuse, but
  `/pet` does not expose its active controls during this phase.

## Public routes

The footer links resolve to:

| Footer label | Route | Content contract |
|---|---|---|
| Features | `/features` | Accurate overview of currently available product capabilities |
| Pricing | `/pricing` | Honest beta/free status; no invented tiers or checkout |
| Changelog | `/changelog` | Dated, verified shipped milestones only |
| Roadmap | `/roadmap` | Current backend work and future items, including the deferred pet system |
| Privacy | `/privacy` | Plain-language beta data handling and user choices |
| Terms | `/terms` | Plain-language beta terms without unsupported legal promises |
| Security | `/security` | Implemented controls, verification evidence, limitations, and disclosure contact |

All routes use the existing public-page frame: `MarketingNav`, matte editorial
content, and `KineticFooter`. Claude updates the public-path/proxy allowlist so
these routes remain reachable while signed out.

## Pet state

`/pet` remains in navigation but becomes a deliberate coming-soon page inside
`AppFrame`. It contains:

- the existing `Companion` eyebrow and `Pet` heading;
- concise copy explaining that Nix is being refined and will return in a future
  phase;
- no feed, evolution, wardrobe, memory, or persistence controls;
- no claim that the feature is currently functional.

The existing pet domain, store, creature, marketing illustrations, and settings
code are not deleted in this pass. The roadmap records the pet system as future
work, including persistence and the eventual production asset.

## Security evidence and attribution

The security page gains a compact evidence ledger with freshly verified values:

- total automated test files and tests from the final full Vitest run;
- the four focused `SupabaseHabitRepository` contract tests;
- named live-browser/security flows actually executed by Claude;
- two separate model-assisted review entries:
  - Claude Fable 5: identity/session and live-browser adversarial review;
  - OpenAI Codex: persistence repository and RLS-boundary review, including
    schema fidelity, ownership isolation, mutation safety, and field
    round-tripping.

Approved Codex attribution:

> The persistence repository and its RLS boundary were independently reviewed
> with OpenAI Codex, including schema fidelity, ownership isolation, mutation
> safety, and field round-tripping.

The page continues to state that Nitor has not yet received an independent human
security audit or certification. Numbers are not hard-coded until their
supporting commands have been run in the final integrated workspace.

## Ownership and sequencing

### Claude Code lane

- Create/update `/features`, `/pricing`, `/changelog`, `/roadmap`, `/privacy`,
  and `/terms`.
- Update the public-route/proxy allowlist for those routes.
- Add page and navigation tests appropriate to Claude-owned files.
- Run the full build, Vitest suite, browser navigation checks, and applicable
  live security checks.
- Hand the exact command outputs and counts back to Codex.

### Codex lane

- Update `KineticFooter.tsx` to point every label to its real route.
- Replace `/pet` with the coming-soon presentation.
- Update `PROGRESS.md` to defer the pet system and refresh verified persistence
  status.
- Update `/security` with the approved attribution and Claude's freshly
  verified numeric evidence.
- Add or update tests for Codex-owned changes.

### Collision rule

Claude does not edit `KineticFooter.tsx`, `/pet`, `/security`, or `PROGRESS.md`.
Codex does not edit the six Claude-owned public pages or the proxy/public-route
allowlist. Claude completes and reports verification before Codex writes final
security totals.

## Verification

- No `href="#"` remains in `KineticFooter.tsx`.
- Every footer destination loads while signed out and retains the public-page
  visual frame.
- `/pet` exposes no active pet controls and clearly says the feature is coming
  later.
- Roadmap and progress documentation agree that the pet system is deferred.
- Security-page numbers match fresh command output and distinguish automated
  tests from model review and live-browser checks.
- Focused tests for each ownership lane pass.
- Full Vitest and production build run after integration.
- Browser verification clicks every footer destination from the landing page.


import type { Metadata } from "next";
import { PublicPage, Section, Note, Row } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Changelog — Nitor",
  description:
    "Dated development milestones for Nitor, from the domain engine and matte redesign through real accounts and the current persistence work.",
};

/**
 * Public changelog. Content rule (2026-07-18 public-pages spec): dated
 * milestones only, each verifiable from the commit history, PROGRESS.md, the
 * design specs, or the test suite. No invented release dates, no version
 * numbers Nitor has never cut, and nothing listed as shipped that is still on
 * a branch — the 18 Jul entry says so explicitly.
 */

interface Entry {
  date: string;
  title: string;
  body: string;
}

const ENTRIES: Entry[] = [
  {
    date: "20 Jul 2026",
    title: "Nitor goes live",
    body: "The first public deployment. Password changes are real and require your current password before anything happens, because a session here is a long-lived cookie and a borrowed browser should not be enough to take an account over. Changing your email address is not available yet, and the field says so plainly rather than pretending. First sign-ins now always reach onboarding — signing in with a password used to skip it.",
  },
  {
    date: "19 Jul 2026",
    title: "Deletion that deletes, and bounded writes",
    body: "Account deletion is real and irreversible, and reports success only after confirming the account is actually gone. Every value the public data API can write is now bounded by the database itself rather than by the app in front of it, and habit and log ownership is enforced by the shape of the schema instead of by application checks. Settings that previously did nothing now do what they say.",
  },
  {
    date: "18 Jul 2026",
    title: "Per-user persistence groundwork",
    body: "Habits and logs tables with row-level security policies that scope every read and write to the owning account, plus a Supabase-backed repository behind the existing storage seam and its contract tests. Merged and live since 20 Jul, verified against the running database rather than only against mocks.",
  },
  {
    date: "17 Jul 2026",
    title: "Accessibility pass and deeper habit editing",
    body: "Focus traps and trigger restoration for every dialog, the ARIA tab pattern in the habit detail drawer, accessible names and screen-reader tables for the stat charts, and AA-contrast tokens on both themes. Habit editing gained category, strictness, and grace days per week. The public security page went up.",
  },
  {
    date: "16 Jul 2026",
    title: "Real accounts",
    body: "Sign-up, sign-in, password reset, and email confirmation against a real backend, with an open-redirect guard on every destination, a twelve-character password minimum, bot resistance on each auth form, and a server-side route guard that runs before any protected page renders.",
  },
  {
    date: "15 Jul 2026",
    title: "Earned freezes, habit management, sourced quotes",
    body: "Streak freezes you earn and choose to spend, a habit detail drawer with a seven-day back-date editor, drag and keyboard reordering, and the quote pool grown from twelve to fifty-eight — every one traced to a primary source, with a remote top-up that degrades to the bundled pool when unavailable.",
  },
  {
    date: "14 Jul 2026",
    title: "Insights, Settings, and the companion prototype",
    body: "Worded correlations gated by significance, streak-risk and habit-stacking cards, a monthly recap, and a grouped searchable Settings screen with JSON and CSV export. A companion prototype landed here too — it has since been deferred; see the roadmap.",
  },
  {
    date: "13 Jul 2026",
    title: "Foundation and the matte redesign",
    body: "The domain engine — five habit types, five schedules, forgiving streaks, momentum — behind a storage interface, then the matte editorial design system, the app shell with its command palette, and the Today, Habits, and Stats screens rebuilt on it. The earlier glassmorphism direction was dropped entirely.",
  },
];

export default function ChangelogPage() {
  return (
    <PublicPage
      eyebrow="Changelog"
      title="What actually landed, and when."
      lede="Nitor has not cut a public release yet, so these are development milestones rather than version numbers. Each entry is traceable to the commit history and to the tests that came with it."
    >
      <Section label="Milestones">
        {ENTRIES.map((e) => (
          <Row key={e.date + e.title} marker={e.date} title={e.title}>
            {e.body}
          </Row>
        ))}
      </Section>

      <Note label="How to read this">
        Entries are dated by when the work landed in the repository, not by a
        release announcement. Anything still in progress is marked as such
        inside its entry. What is coming next lives on the roadmap.
      </Note>
    </PublicPage>
  );
}

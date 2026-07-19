import type { Metadata } from "next";
import { PublicPage, Section, Note, Row } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Features — Nitor",
  description:
    "What Nitor does today: five habit types, five schedules, a forgiving streak with earned freezes, a year heatmap, worded insights, and full data export.",
};

/**
 * Public features page. Content rule (see the 2026-07-18 public-pages spec):
 * every "Available now" item below is verifiable in this repository — the
 * domain engine in src/domain, the screens in src/app, and their tests.
 * Anything not yet shipped lives under "Not yet" and is labelled as such.
 * The Nix companion is deliberately listed as deferred, not as a feature.
 */

interface Item {
  marker: string;
  title: string;
  body: string;
}

const NOW: Item[] = [
  {
    marker: "Habits",
    title: "Five habit types, five schedules",
    body: "Track yes/no habits, counts, durations, quantified amounts with your own unit, and quit habits. Schedule each one daily, on chosen weekdays, N times a week, every N days, or on a day of the month.",
  },
  {
    marker: "Streaks",
    title: "A streak that forgives on purpose",
    body: "Choose strict, balanced, or flexible per habit, and allow up to seven grace days a week. Alongside the raw streak, a momentum score reads recent effort rather than punishing a single bad day.",
  },
  {
    marker: "Freezes",
    title: "Freezes you earn, then choose to spend",
    body: "Seven completed scheduled days earn one freeze, banked up to two. A freeze bridges a single isolated miss — and Nitor asks before spending one rather than quietly rewriting your history.",
  },
  {
    marker: "Today",
    title: "One checklist, per-type controls",
    body: "A single-column list for the day with the right control for each habit type, a daily quote drawn from a pool of sourced quotations, and a Done-today group so finished work moves out of the way.",
  },
  {
    marker: "Editing",
    title: "Back-dating, reordering, archiving",
    body: "A detail drawer per habit holds a mini heatmap, the streak and freeze bank, an editor for the fields that shape scoring, and a back-date editor for the last seven days. Reorder by drag or by keyboard; archive or delete with a typed confirmation.",
  },
  {
    marker: "Stats",
    title: "A year at a glance",
    body: "A year-long completion heatmap, a momentum line against your goal, weekday rhythm bars, and a sparkline row per habit — drawn as custom matte SVG, with a screen-reader table behind every chart.",
  },
  {
    marker: "Insights",
    title: "Findings in words, not coefficients",
    body: "A weekly story lede, correlations stated in plain language and only when statistically meaningful, a streak-risk warning, a habit-stacking suggestion, and a shareable monthly recap.",
  },
  {
    marker: "Yours",
    title: "Your data, exportable",
    body: "Export everything as JSON or CSV from Settings, at any time, without asking anyone. Light and dark themes, accent choice, density, and a reduce-motion switch are all local preferences.",
  },
  {
    marker: "Access",
    title: "Accounts and keyboard access",
    body: "Email and password sign-up, sign-in, and password reset with email confirmation, behind a server-side route guard. A ⌘K command palette, focus-trapped dialogs, and ARIA tab semantics throughout.",
  },
];

const LATER: Item[] = [
  {
    marker: "Building",
    title: "Cloud sync of habits and logs",
    body: "The database tables, per-user row-level security policies, and the Supabase-backed repository exist and are under test. Rolling this out as the default store for every account is the current piece of work.",
  },
  {
    marker: "Planned",
    title: "Sign in with Google",
    body: "Email and password is the only sign-in method implemented today. The stubbed social buttons were removed rather than left to look functional.",
  },
  {
    marker: "Planned",
    title: "Reminders that actually send",
    body: "Notification preferences and quiet hours can be set in Settings, but nothing is delivered yet. Delivery is a later phase.",
  },
  {
    marker: "Planned",
    title: "Import and merge",
    body: "Export works today. Bringing data back in — and merging it with what is already there — has not been built.",
  },
  {
    marker: "Deferred",
    title: "Nix, the companion",
    body: "The habit companion is not active. Its page currently says so plainly. The concept, its persistence, and a final production asset are on the roadmap for a later phase.",
  },
];

export default function FeaturesPage() {
  return (
    <PublicPage
      eyebrow="Features"
      title="Everything here is something you can use."
      lede="Nitor is in beta, so this page is split down the middle: what the app does today, and what it does not do yet. Nothing in the first list is a mockup, and nothing in the second is described as if it were finished."
    >
      <Section label="Available now">
        {NOW.map((item) => (
          <Row key={item.title} marker={item.marker} title={item.title}>
            {item.body}
          </Row>
        ))}
      </Section>

      <Section
        label="Not yet"
        intro="Listed here so you can tell the difference at a glance. These are either in progress or planned — none of them work today."
      >
        {LATER.map((item) => (
          <Row key={item.title} marker={item.marker} title={item.title}>
            {item.body}
          </Row>
        ))}
      </Section>

      <Note label="Beta — read this">
        Nitor is under active development and features can change. If a
        capability is not on the list above, assume it does not exist yet rather
        than that it was left off by accident.
      </Note>
    </PublicPage>
  );
}

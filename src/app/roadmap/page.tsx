import type { Metadata } from "next";
import { PublicPage, Section, Note, Row } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Roadmap — Nitor",
  description:
    "What Nitor is building now — per-user persistence and row-level security — what comes after, and what is only an idea. Including the deferred Nix companion.",
};

/**
 * Public roadmap. Content rule (2026-07-18 public-pages spec): committed work
 * and exploratory ideas are visibly separated, and the Nix companion sits in
 * the future section — including its persistence and the eventual production
 * asset — rather than being presented as a live feature.
 */

interface Item {
  marker: string;
  title: string;
  body: string;
}

const NOW: Item[] = [
  {
    marker: "In progress",
    title: "Per-user persistence and row-level security",
    body: "Moving habits and logs out of the browser session and into per-account rows in the database. The tables, the isolation policies that scope every read and write to their owner, and the repository that talks to them are built and under test; making that the default path for every account is what remains.",
  },
  {
    marker: "In progress",
    title: "Runtime verification of the storage boundary",
    body: "Proving the isolation policies hold against a live backend rather than only in tests: negative checks that one account cannot read or write another's rows, and end-to-end browser runs of the real flows.",
  },
];

const NEXT: Item[] = [
  {
    marker: "Blocked",
    title: "Sign in with Google",
    body: "A real OAuth flow to sit beside email and password. The stubbed buttons were deleted rather than left in place looking functional, and Google follows the same rule: it stays off the sign-in page until it genuinely works. The callback that receives the sign-in is already built and tested; what is missing is a Google Cloud OAuth client, so the provider is still disabled in the backend and a button would fail the moment it was pressed.",
  },
  {
    marker: "Committed",
    title: "Settings and preferences that follow you",
    body: "Theme, accent, week start, day rollover, and quote preferences currently live in one browser. Syncing them to your account comes after habit data is safely stored.",
  },
  {
    marker: "Committed",
    title: "Notification delivery",
    body: "Reminder windows and quiet hours can already be configured; nothing is sent. Delivery — including the domain and mail setup it depends on — is a later phase.",
  },
  {
    marker: "Committed",
    title: "Import and merge",
    body: "Export exists today. Reading data back in, and reconciling it with what is already in the account, is the other half of that promise.",
  },
];

const PET: Item[] = [
  {
    marker: "Deferred",
    title: "Nix, the habit companion",
    body: "The companion is not part of the current phase. Its page says so plainly rather than showing controls that do nothing, and the underlying concept — mood tied to your recent consistency, a deliberate feed, an evolution track, no guilt when you miss — is kept for a future phase rather than abandoned.",
  },
  {
    marker: "Deferred",
    title: "Companion persistence",
    body: "Whatever Nix remembers should belong to your account rather than to one browser. That work is queued behind the habit and settings persistence it would build on.",
  },
  {
    marker: "Deferred",
    title: "The final production asset",
    body: "Nix is currently a procedural placeholder. The finished creature — a properly built and rigged asset with its own idle, eat, happy, sleepy, and evolve states — is future work, and Nix will not return to the app before it exists.",
  },
];

const IDEAS: Item[] = [
  {
    marker: "Idea",
    title: "A native mobile companion app",
    body: "Nitor is desktop-first by design. A phone app is an obvious eventual want, but nothing has been designed, scoped, or started.",
  },
  {
    marker: "Idea",
    title: "Health and calendar sources",
    body: "Some habits could be confirmed by data you already generate. Interesting, unscoped, and dependent on privacy questions that remain unanswered.",
  },
  {
    marker: "Idea",
    title: "Shared and accountable habits",
    body: "Occasionally requested, easy to get wrong, and in tension with how private the current data model is. Recorded here as a question rather than a plan.",
  },
];

export default function RoadmapPage() {
  return (
    <PublicPage
      eyebrow="Roadmap"
      title="What's being built, and what's only an idea."
      lede="Three lists, kept apart on purpose. Work in progress is happening now. Committed work is decided but not started or not finished. Ideas are just that — no date, no promise, and some of them will never ship."
    >
      <Section
        label="Now — in progress"
        intro="The current phase is the backend: making your data genuinely yours, stored per account and isolated by the database itself."
      >
        {NOW.map((i) => (
          <Row key={i.title} marker={i.marker} title={i.title}>
            {i.body}
          </Row>
        ))}
      </Section>

      <Section
        label="Next — committed"
        intro="Decided and specified, waiting on the persistence work to land first."
      >
        {NEXT.map((i) => (
          <Row key={i.title} marker={i.marker} title={i.title}>
            {i.body}
          </Row>
        ))}
      </Section>

      <Section
        label="Later — the companion"
        intro="Nix is deferred to a future phase. It is not an active feature today, and the app no longer pretends otherwise."
      >
        {PET.map((i) => (
          <Row key={i.title} marker={i.marker} title={i.title}>
            {i.body}
          </Row>
        ))}
      </Section>

      <Section
        label="Exploring — no commitment"
        intro="Ideas under consideration. None of these are scheduled, and listing one here is not a promise to build it."
      >
        {IDEAS.map((i) => (
          <Row key={i.title} marker={i.marker} title={i.title}>
            {i.body}
          </Row>
        ))}
      </Section>

      <Note label="Beta — read this">
        This roadmap describes intent, not a delivery schedule. Items move
        between sections, and items in the exploring list are frequently
        dropped. What has already landed is on the changelog.
      </Note>
    </PublicPage>
  );
}

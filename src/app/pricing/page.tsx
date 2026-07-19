import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, Section, Note, Row } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Pricing — Nitor",
  description:
    "Nitor is free during the beta. There is no billing system, no card on file, and no paid tier — and this page says so instead of inventing one.",
};

/**
 * Public pricing page. Content rule (2026-07-18 public-pages spec): no invented
 * tiers, prices, trials, checkout, or guarantees. The repository contains no
 * payment integration of any kind, so the honest page is a statement of that
 * fact plus what happens if that ever changes.
 */

const FACTS = [
  {
    marker: "Today",
    title: "Free, with no payment details",
    body: "Every part of Nitor that works is available to every beta account at no cost. Nitor cannot charge you today: there is no checkout, no card on file, and no billing code in the product at all.",
  },
  {
    marker: "Later",
    title: "Undecided, honestly",
    body: "No paid plan has been designed — not what it would include, not what it would cost, not which capabilities would sit behind it. Rather than publish a plausible-looking table that would later have to be walked back, this page stays empty until the decision is real.",
  },
  {
    marker: "Promise",
    title: "Nothing starts billing you by surprise",
    body: "If Nitor ever introduces a paid plan, it will be announced here and to beta accounts before it takes effect, and it will require you to actively choose it. A beta account will never silently become a charged one.",
  },
  {
    marker: "Exit",
    title: "Your data leaves with you",
    body: "Export to JSON or CSV is in Settings today and is not a paid feature. Whatever pricing eventually looks like, getting your own history out will not be the thing sitting behind a paywall.",
  },
];

export default function PricingPage() {
  return (
    <PublicPage
      eyebrow="Pricing"
      title="Free while it's in beta."
      lede="There is no price list on this page because there is no paid plan — and no way to pay for one. Nitor is early software, given away while it earns the right to ask for anything."
    >
      <Section label="The whole story">
        {FACTS.map((f) => (
          <Row key={f.title} marker={f.marker} title={f.title}>
            {f.body}
          </Row>
        ))}
      </Section>

      <Note label="Beta — read this">
        Free also means unfinished. Nitor is in active development, features are
        still moving, and data written during the beta may be affected by
        changes to how it is stored. Keep an export if something matters to you.
        The current state of play is on{" "}
        <Link
          href="/roadmap"
          className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          the roadmap
        </Link>
        .
      </Note>
    </PublicPage>
  );
}

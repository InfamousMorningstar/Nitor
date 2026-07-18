import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, Section, Note, Row, Clause } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Privacy — Nitor",
  description:
    "What Nitor stores, where it stores it, who else sees it, and what you can do about it — described for the beta it actually is.",
};

/**
 * Public privacy page. Content rule (2026-07-18 public-pages spec): describe
 * only data handling that can be verified in this repository. Every claim
 * below maps to code —
 *   · browser-local keys: src/state/theme.tsx, settingsStore, petStore,
 *     src/data/quotes/remote.ts, src/components/today/FreezePrompt.tsx
 *   · account + habit rows: supabase/profiles.sql, supabase/habits.sql
 *     (row-level security, user_id → auth.users on delete cascade)
 *   · Turnstile on the auth forms; transactional confirmation/reset email
 *   · no analytics, advertising, or third-party tracking scripts exist in src/
 * No encryption, retention-period, deletion-SLA, subprocessor-list, or
 * compliance-certification claims — none of those are verifiable here.
 */

const STORES = [
  {
    marker: "Account",
    title: "Your sign-in details, on the server",
    body: "Creating an account stores your email address and the credential the authentication provider derives from your password, along with a profile row recording whether you have finished onboarding. This is what lets you sign in from more than one browser.",
  },
  {
    marker: "Habits",
    title: "Your habits and logs, scoped to you",
    body: "As per-account storage rolls out, your habits and daily logs are written to database rows tagged with your account id. The database refuses, by policy, to return or modify a row that belongs to a different account — the check is in the database, not only in the app. Signed out, the habits you see are seeded demo data that lives in the page and is never sent anywhere.",
  },
  {
    marker: "Browser",
    title: "Preferences that never leave your device",
    body: "Theme, accent, density, reduce-motion, week start, day rollover, quote preferences, the companion's name, and dismissed prompts are kept in your browser's local storage. They never leave your device and do not sync between devices. Clearing your site data clears them.",
  },
  {
    marker: "Quotes",
    title: "A cached quote pool",
    body: "Nitor ships with a bundled set of sourced quotations and occasionally tops it up from the Nitor server, caching the result in your browser. The request asks for quotations; it does not carry your habits.",
  },
];

const THIRD_PARTIES = [
  {
    marker: "Hosting",
    title: "The database and authentication provider",
    body: "Nitor's accounts and per-account data are held on managed infrastructure operated by Supabase. Supabase stores what is described above because it runs the database Nitor is built on.",
  },
  {
    marker: "Anti-bot",
    title: "Cloudflare Turnstile on the auth forms",
    body: "Sign-in, sign-up, and password reset run a Cloudflare Turnstile challenge, so your browser contacts Cloudflare when you use those forms. This exists to keep automated abuse off the sign-up path.",
  },
  {
    marker: "Email",
    title: "Confirmation and reset email",
    body: "Confirming an address and resetting a password send you an email. Nitor does not send marketing email, and the newsletter field in the footer is not wired to anything.",
  },
];

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Privacy"
      title="What Nitor holds, and what it doesn't."
      lede="Nitor is a habit tracker in beta, built and run by one person. This page describes what the software actually does with your data today — not a policy template, and not a description of a company that doesn't exist."
    >
      <Section
        label="What Nitor stores"
        intro="Four buckets, and they behave differently. It is worth knowing which is which."
      >
        {STORES.map((s) => (
          <Row key={s.title} marker={s.marker} title={s.title}>
            {s.body}
          </Row>
        ))}
      </Section>

      <Section
        label="Who else is involved"
        intro="Nitor is not self-contained. These are the services your data touches, and why."
      >
        {THIRD_PARTIES.map((t) => (
          <Row key={t.title} marker={t.marker} title={t.title}>
            {t.body}
          </Row>
        ))}
      </Section>

      <Section label="The rest of it">
        <Clause title="No tracking, no advertising, no selling">
          <p>
            Nitor contains no analytics scripts, no advertising code, and no
            third-party tracking pixels. Nobody is buying your habit data: it is
            not for sale, and the means to sell it has never been built.
          </p>
          <p>
            Your habits are not read to build a profile of you either. The
            insights you see are computed for you, from your own data.
          </p>
        </Clause>

        <Clause title="Getting your data out">
          <p>
            Settings exports everything Nitor holds about your habits as JSON or
            CSV, whenever you want, without asking anyone. That is deliberate: the
            ability to leave is what keeps the rest of this honest.
          </p>
        </Clause>

        <Clause title="Deleting your account">
          <p>
            There is no self-serve delete button in the app yet. Account
            deletion can be requested by email. When an account is removed, the
            habit and log rows attached to it are removed with it — the database
            is configured to cascade the deletion rather than leave orphaned
            rows behind.
          </p>
          <p>
            No deletion window is quoted on this page, because it is not
            something that can be measured yet. Ask, and I will confirm when it
            is done.
          </p>
        </Clause>

        <Clause title="What is not being claimed">
          <p>
            This page describes only what can be pointed at in the code and the
            database configuration. Nitor has not been through an independent
            privacy or security audit, holds no compliance certification, and
            publishes no formal retention schedule. If a claim of that kind is
            not on this page, it is absent because it cannot yet be
            substantiated — the controls that do exist are itemised on{" "}
            <Link
              href="/security"
              className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              the security page
            </Link>
            .
          </p>
        </Clause>

        <Clause title="Questions">
          <p>
            Ask directly:{" "}
            <a
              href="mailto:s.ahmad0147@gmail.com?subject=Nitor%20privacy%20question"
              className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              s.ahmad0147@gmail.com
            </a>
            .
          </p>
        </Clause>
      </Section>

      <Note label="Beta — read this">
        Nitor is early software under active development, and how data is stored
        is itself changing right now as per-account persistence rolls out. Data
        written during the beta may be affected by that work. Keep an export of
        anything you would be upset to lose, and expect this page to be updated
        as the storage changes.
      </Note>
    </PublicPage>
  );
}

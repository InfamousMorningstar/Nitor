import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, Section, Note, Clause } from "@/components/marketing/PublicPage";

export const metadata: Metadata = {
  title: "Terms — Nitor",
  description:
    "Plain-language terms for the Nitor beta: what you can expect from early software, what the beta asks of you, and what is deliberately not promised yet.",
};

/**
 * Public terms page. Content rule (2026-07-18 public-pages spec): restrained
 * plain-language beta terms only. No registered company identity, no governing
 * law or jurisdiction, no warranty or liability boilerplate, no paid-service
 * terms, no age threshold — none of those can be stated truthfully for this
 * project today, and inventing them would be worse than omitting them.
 */

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Terms"
      title="Beta terms, in plain words."
      lede="Nitor is pre-release software offered free of charge while it is being built. These are not contract-grade terms and they do not pretend to be — they are a straight description of what you are agreeing to by using an early build."
    >
      <Section label="The agreement">
        <Clause title="This is a beta">
          <p>
            Nitor is unfinished. Features appear, change, and are removed;
            screens are rebuilt; the way data is stored is itself being
            reworked. Availability is best-effort, and there is no uptime
            commitment behind it.
          </p>
          <p>
            Treat Nitor as a tool you are trying out rather than a system of
            record. Export anything you would be upset to lose — Settings does
            this as JSON or CSV, at any time.
          </p>
        </Clause>

        <Clause title="What it costs">
          <p>
            Nothing. There is no paid plan, no payment method on file, and no
            billing in the product, so there is nothing here about charges,
            refunds, renewals, or cancellation. If that ever changes it will be
            announced before it takes effect and will require you to choose it —
            see{" "}
            <Link
              href="/pricing"
              className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              pricing
            </Link>
            .
          </p>
        </Clause>

        <Clause title="Your account">
          <p>
            You are responsible for the account you create and for keeping your
            password to yourself. Get in touch if you think someone else has got
            into it. Use a real address you can receive mail at — confirmation and
            password reset depend on it.
          </p>
          <p>
            One person, one account. Do not share credentials, and do not create
            accounts on someone else&rsquo;s behalf without them knowing.
          </p>
        </Clause>

        <Clause title="What the beta asks of you">
          <p>
            Do not attack the service, attempt to reach data that is not yours,
            automate abuse of the sign-up path, or use Nitor to break the law.
            Probing security in good faith is welcome and has its own route —
            report what you find rather than exploiting it.
          </p>
          <p>
            Nitor may suspend an account that is being used to attack the
            service or the people using it.
          </p>
        </Clause>

        <Clause title="Your data is yours">
          <p>
            The habits and logs you enter belong to you. Nitor claims no
            ownership of them, does not sell them, and does not use them to
            build a profile of you. What is stored and where is set out on{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              privacy
            </Link>
            .
          </p>
          <p>
            The Nitor name, wordmark, crest, and the design of the app itself
            are not yours to reuse.
          </p>
        </Clause>

        <Clause title="Ending it">
          <p>
            You can stop using Nitor whenever you like, and account deletion can
            be requested by email; the habit data attached to it goes with it.
            The beta may end, or stop being offered to a particular account —
            that will not happen silently where it can be avoided.
          </p>
        </Clause>

        <Clause title="What these terms deliberately don't say">
          <p>
            You will not find a company registration, a governing jurisdiction,
            warranty disclaimers, liability caps, or an arbitration clause here.
            Nitor is a personal project in beta, and stating those things now
            would mean inventing them.
          </p>
          <p>
            The practical consequence is worth being blunt about: this is free,
            unfinished software provided as-is, and you should not rely on it for
            anything that matters more than tracking your own habits.
          </p>
        </Clause>

        <Clause title="Changes and contact">
          <p>
            These terms will change as Nitor does, and the current version is
            always the one on this page. Questions go to{" "}
            <a
              href="mailto:s.ahmad0147@gmail.com?subject=Nitor%20terms%20question"
              className="underline underline-offset-4 [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
            >
              s.ahmad0147@gmail.com
            </a>
            .
          </p>
        </Clause>
      </Section>

      <Note label="Beta — read this">
        These are pre-release terms for pre-release software. They will be
        replaced with something more formal before Nitor is generally available,
        and continuing to use the beta after that point means accepting whatever
        stands on this page at the time.
      </Note>
    </PublicPage>
  );
}

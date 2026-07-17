import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { KineticFooter } from "@/components/marketing/KineticFooter";

export const metadata: Metadata = {
  title: "Security — Nitor",
  description:
    "How Nitor protects your account and your data: server-verified sessions, database-enforced isolation, and controls written into the spec before the first feature shipped.",
};

/**
 * Public security page (added to proxy PUBLIC_PATHS). Deliberately honest for a
 * beta: it describes controls that are actually implemented, marks the ones
 * whose enforcement is still being finalized as "In progress", and makes no
 * claim of independent audit or certification — those are named as roadmap.
 *
 * The signature device is the control ledger: each row is keyed to the real
 * spec constraint id (S1, S6, S9, S11…) from the Phase 2 design spec, so the
 * left-gutter marker encodes a true classification rather than decorating.
 */

const eyebrow =
  "font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.14em] [color:rgb(var(--text-mute))]";

type Status = "active" | "progress";

interface Control {
  code: string;
  title: string;
  body: string;
  status: Status;
}

interface Group {
  label: string;
  controls: Control[];
}

const GROUPS: Group[] = [
  {
    label: "Identity & access",
    controls: [
      {
        code: "S1",
        title: "Server-verified sessions",
        body: "Every request is authorized on the server by checking your session's cryptographic signature. Your browser is never trusted to assert who you are.",
        status: "active",
      },
      {
        code: "Guard",
        title: "One authorization boundary",
        body: "A single server-side guard runs before any protected page renders and decides whether you're allowed in. There is no client-side check to switch off.",
        status: "active",
      },
      {
        code: "S6·S7",
        title: "Database-enforced isolation",
        body: "Every table denies access by default. Row-level security means you can only ever read or change your own data — enforced by the database itself, not just the app.",
        status: "active",
      },
    ],
  },
  {
    label: "Account protection",
    controls: [
      {
        code: "S9",
        title: "Open-redirect protection",
        body: "Sign-in and reset links can only send you to a page inside Nitor. A destination pointing anywhere else is rejected before you are redirected.",
        status: "active",
      },
      {
        code: "S10",
        title: "Password policy & private errors",
        body: "New passwords must be at least 12 characters, and a failed sign-in never reveals whether an email already has an account.",
        status: "active",
      },
      {
        code: "S11",
        title: "Bot resistance on every auth form",
        body: "Cloudflare Turnstile guards sign-in, sign-up, and password reset, and each challenge is single-use. Mandatory server-side verification is being finalized.",
        status: "progress",
      },
    ],
  },
  {
    label: "Secrets & data",
    controls: [
      {
        code: "S3·S4",
        title: "Least-privilege keys",
        body: "Privileged keys never reach your browser or our code repository. The browser carries only a low-privilege key, and the database remains the real boundary.",
        status: "active",
      },
      {
        code: "Beta",
        title: "Where your data lives",
        body: "During the beta, habit data stays in your browser session. Before general availability it moves into the same row-level-secured database that already protects your account.",
        status: "progress",
      },
    ],
  },
  {
    label: "How we verify",
    controls: [
      {
        code: "Tests",
        title: "An adversarial test suite",
        body: "Every change runs through an automated test suite — including tests that actively try to break these controls: open-redirect bypass, cross-user data access, and re-using a spent challenge token.",
        status: "active",
      },
      {
        code: "AI audit",
        title: "Adversarial review by a frontier AI model",
        body: "The identity stack was audited end to end with Claude Fable 5: every control on this page re-verified against the code, the full sign-up, sign-in and recovery flows driven in a real browser against the live backend — including attempted open-redirect and cross-user writes — and the issues it found fixed before merge. This complements, and does not replace, the independent human audit on our roadmap.",
        status: "active",
      },
      {
        code: "Advisors",
        title: "Clean database advisors",
        body: "Supabase's automated security advisors report zero findings against our database configuration.",
        status: "active",
      },
    ],
  },
];

function StatusChip({ status }: { status: Status }) {
  const active = status === "active";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em]">
      <span
        aria-hidden="true"
        className={
          "h-1.5 w-1.5 rounded-full " +
          (active
            ? "[background:rgb(var(--accent))]"
            : "border [border-color:rgb(var(--text-mute))]")
        }
      />
      <span
        className={active ? "[color:rgb(var(--text-dim))]" : "[color:rgb(var(--text-mute))]"}
      >
        {active ? "Active" : "In progress"}
      </span>
    </span>
  );
}

function ControlRow({ control }: { control: Control }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-2 border-t py-6 [border-color:rgb(var(--hairline)/0.08)] sm:grid-cols-[5rem_1fr] sm:gap-x-8">
      <div
        aria-hidden="true"
        className="pt-0.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--accent))]"
      >
        {control.code}
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h3 className="text-[17px] font-medium [color:rgb(var(--text))]">
            {control.title}
          </h3>
          <StatusChip status={control.status} />
        </div>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          {control.body}
        </p>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col [background:rgb(var(--bg))]">
      <MarketingNav />

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 pb-24 pt-32 md:px-10 md:pt-40">
        {/* Hero — thesis, not a stat block */}
        <section>
          <p className={eyebrow}>Trust &amp; Security</p>
          <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-tight [color:rgb(var(--text))] sm:text-5xl md:text-6xl">
            Built to be checked, not trusted.
          </h1>
          <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed [color:rgb(var(--text-dim))]">
            Security wasn&rsquo;t bolted onto Nitor at the end. Before the first
            feature shipped, the rules below were written into the spec — and
            every change since is checked against them. Here is exactly how your
            account and your data are protected.
          </p>

          <p className="mt-8 border-l-2 py-1 pl-4 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed [border-color:rgb(var(--accent))] [color:rgb(var(--text-dim))]">
            The server — not your browser — decides what you can see, on every
            request.
          </p>
        </section>

        {/* Beta honesty — covers roadmap (audit + encrypted persistence) */}
        <section className="mt-14 rounded-xl border p-6 [background:rgb(var(--surface))] [border-color:rgb(var(--hairline)/0.1)]">
          <p className={eyebrow}>Beta — read this</p>
          <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
            Nitor is in active development. This page describes the security we
            have built for identity and sessions today, following current
            platform security guidance: signature-verified sessions, new-generation
            least-privilege API keys, and database-enforced row isolation. Each
            release of the identity stack is additionally reviewed adversarially
            with Claude Fable 5, a frontier AI model, which re-runs its own tests
            against the live app. It is{" "}
            <span className="[color:rgb(var(--text))]">not</span> independently
            audited or certified yet — independent human security review and
            encrypted, server-side data storage are part of our path to general
            availability, and we will update this page as each one lands.
          </p>
        </section>

        {/* The control ledger — the signature device */}
        <section className="mt-20">
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-14 first:mt-0">
              <p className={eyebrow}>{group.label}</p>
              <div className="mt-4">
                {group.controls.map((c) => (
                  <ControlRow key={c.title} control={c} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Responsible disclosure */}
        <section className="mt-20 rounded-xl border p-8 [background:rgb(var(--surface))] [border-color:rgb(var(--hairline)/0.1)]">
          <p className={eyebrow}>Report a vulnerability</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight [color:rgb(var(--text))]">
            Found something? Tell us.
          </h2>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
            If you believe you have found a security issue in Nitor, email us. We
            read every report and will work with you on a fix before any public
            disclosure — please give us a reasonable window to respond.
          </p>
          <a
            href="mailto:s.ahmad0147@gmail.com?subject=Nitor%20security%20report"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-[family-name:var(--font-mono)] text-[13px] [border-color:rgb(var(--hairline)/0.14)] [color:rgb(var(--text))] transition-colors duration-[var(--dur-micro)] hover:[border-color:rgb(var(--accent))] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            s.ahmad0147@gmail.com &rarr;
          </a>
        </section>
      </main>

      <KineticFooter />
    </div>
  );
}

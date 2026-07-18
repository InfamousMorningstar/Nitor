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
        body: "Every protected request is authorized on the server by checking your session's cryptographic signature. Your browser is never trusted to assert who you are.",
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
        body: "Every user-owned table denies cross-user access by default. Row-level security means you can only ever read or change your own data — enforced by the database itself, not just the app.",
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
        body: "Privileged keys never reach your browser or the source repository. The browser carries only a low-privilege key, and the database remains the real boundary.",
        status: "active",
      },
      {
        code: "RLS",
        title: "Where your data lives",
        body: "Authenticated habit and log data lives in Supabase behind database-enforced row-level security. Guest data remains local to the browser experience.",
        status: "active",
      },
    ],
  },
  {
    label: "Verification controls",
    controls: [
      {
        code: "DB",
        title: "Clean database advisors",
        body: "Supabase's automated security advisors reported zero findings on 2026-07-18. All four public tables — profiles, quotes, habits, and logs — were confirmed with row-level security enabled.",
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

function EvidenceCard({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border p-6 [background:rgb(var(--surface))] [border-color:rgb(var(--hairline)/0.1)]">
      <p className={eyebrow}>{code}</p>
      {/* h3, not h2: each card nests under the "Evidence ledger" h2 above. */}
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight [color:rgb(var(--text))]">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
        {children}
      </div>
    </article>
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
            Before authenticated persistence was introduced, the rules below
            were written into the Phase 2 specification. Every related change
            since is checked against them. Here is exactly how your account and
            your data are protected.
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
            Nitor is active beta software. This page describes controls that are
            implemented and reproducible today: signature-verified sessions,
            least-privilege API keys, database-enforced row isolation, automated
            tests, and live-browser checks. Nitor has{" "}
            <span className="[color:rgb(var(--text))]">not</span> been independently
            audited or certified yet. Independent human security review remains
            on the path to general availability.
          </p>
        </section>

        {/* The control ledger — the signature device */}
        <section className="mt-20">
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-14 first:mt-0">
              {/* The group label is the section's real heading, so it renders
                  as an h2 styled as the eyebrow — not a <p>. Without this the
                  page jumps h1 → h3 at the first ControlRow and screen-reader
                  users lose the outline. Same pattern as PublicPage's Section. */}
              {/* The group label is the section's real heading, so it renders
                  as an h2 styled as the eyebrow — not a <p>. Without this the
                  page jumps h1 → h3 at the first ControlRow and screen-reader
                  users lose the outline. Same pattern as PublicPage's Section. */}
              <h2 className={eyebrow}>{group.label}</h2>
              <div className="mt-4">
                {group.controls.map((c) => (
                  <ControlRow key={c.title} control={c} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-20">
          <h2 className={eyebrow}>Evidence ledger · verified 2026-07-18</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <EvidenceCard title="Automated tests" code="271">
              <p>
                <span className="[color:rgb(var(--text))]">40 test files and 271 tests</span>{" "}
                passed in the integrated workspace.
              </p>
              <p>
                Claude added 62 focused public-page and route-guard tests, including
                page contracts, solo-developer voice checks, public allowlisting, and
                protected-route adversarial cases.
              </p>
              <p>
                8 Codex-lane tests across 5 files passed, including 4 repository contract
                tests for field fidelity and query behavior.
              </p>
            </EvidenceCard>

            <EvidenceCard title="Live-browser checks" code="7 routes">
              <p>
                Seven public routes loaded while signed out without redirect. Footer
                click-through, heading and landmark structure, and keyboard focus order
                were checked in the rendered app.
              </p>
              <p>
                Light and dark theme contrast was measured at a minimum ratio of{" "}
                <span className="[color:rgb(var(--text))]">4.60:1</span>, meeting WCAG AA
                for normal text.
              </p>
              <p>
                Adversarial routing covered prefix escape, raw and percent-encoded path
                traversal, case variants, and all six protected routes with the{" "}
                <code>?next</code> destination preserved.
              </p>
            </EvidenceCard>

            <EvidenceCard title="Model-assisted review" code="2 reviews">
              <p>
                Claude Fable 5 reviewed identity, sessions, route protection, and the
                live-browser adversarial checks against the integrated app.
              </p>
              <p>
                The persistence repository and its RLS boundary were independently reviewed
                with OpenAI Codex, including schema fidelity, ownership isolation, mutation
                safety, and field round-tripping.
              </p>
              <p>
                Model-assisted review is not an independent human audit or certification.
              </p>
            </EvidenceCard>
          </div>
        </section>

        {/* Responsible disclosure */}
        <section className="mt-20 rounded-xl border p-8 [background:rgb(var(--surface))] [border-color:rgb(var(--hairline)/0.1)]">
          <p className={eyebrow}>Report a vulnerability</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight [color:rgb(var(--text))]">
            Found something? Tell Salman.
          </h2>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
            If you believe you have found a security issue in Nitor, email Salman
            Ahmad directly. Every report is read, investigated, and handled before
            coordinated public disclosure. Please allow a reasonable response window.
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

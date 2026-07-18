"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Glitch } from "@/components/brand/Glitch";

type FooterLink = { label: string; href: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "/security" },
    ],
  },
];

const footerLinkClass =
  "font-[family-name:var(--font-mono)] text-[13px] [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]";

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
        {title}
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.href.startsWith("/") ? (
              <Link href={l.href} className={footerLinkClass}>
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className={footerLinkClass}>
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true); // stubbed — no backend call
  }

  return (
    <div>
      <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]">
        Stay in the loop
      </p>
      {sent ? (
        <p className="mt-4 text-[13px] [color:rgb(var(--text-dim))]">You&rsquo;re on the list.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <label htmlFor="footer-email" className="sr-only">
            Email address
          </label>
          <input
            id="footer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full min-w-0 rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.14)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] placeholder:[color:rgb(var(--text-mute))] focus:[border-color:rgb(var(--accent))]"
          />
          <button
            type="submit"
            aria-label="Subscribe"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg transition-colors duration-[var(--dur-micro)] [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] hover:[background:rgb(var(--accent-glow))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            &rarr;
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Small "maker's seal" — the Ahmad coat-of-arms (helm + shield + wolves)
 * cropped to a legible emblem (/crest-seal.png; the full poster lives at
 * /crest.png). The art is dark gold/maroon on near-black, so it sits on a
 * fixed dark chip (not the theme surface token) with a hairline frame and
 * fills it edge-to-edge via object-cover — seamless on light theme too.
 * Degrades to nothing if the asset is missing.
 */
function CrestSeal() {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border [background:#0A0A0B] [border-color:rgb(var(--hairline)/0.16)] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/crest-seal.png"
        alt="Salman Ahmad coat of arms"
        width={48}
        height={48}
        className="h-full w-full rounded-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}

function FooterAttribution() {
  return (
    <div className="flex items-center gap-3">
      <CrestSeal />
      <span className="font-[family-name:var(--font-mono)] text-xs [color:rgb(var(--text-mute))]">
        Designed &amp; Engineered by{" "}
        <a
          href="https://portfolio.ahmxd.net"
          target="_blank"
          rel="noopener noreferrer"
          className="[color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        >
          Salman Ahmad
        </a>
      </span>
    </div>
  );
}

/**
 * The kinetic NITOЯ footer — the second signature moment (see DESIGN.md /
 * task brief). The giant wordmark band slides up into view once, then
 * drifts horizontally bound to scroll position while in view. The final
 * "Я" plays a one-shot Glitch on hover (the footer's slot in the app's
 * four-use Glitch budget). Fully static (no slide, no drift) under
 * reduced-motion.
 */
export function KineticFooter() {
  const bandRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const [rTrigger, setRTrigger] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      gsap.registerPlugin(ScrollTrigger);
      if (cancelled || !bandRef.current || !wordRef.current) return;

      ctx = gsap.context(() => {
        gsap.set(bandRef.current, { y: 60, opacity: 0 });
        gsap.to(bandRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: bandRef.current,
            start: "top 88%",
            toggleActions: "play reverse play reverse",
          },
        });

        gsap.to(wordRef.current, {
          xPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: bandRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }, bandRef);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  function handleWordHover() {
    setRTrigger(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setRTrigger(false), 350);
  }

  return (
    <footer className="relative overflow-hidden border-t [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--bg))]">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-20 md:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <FooterColumn key={c.title} title={c.title} links={c.links} />
          ))}
          <NewsletterForm />
        </div>
      </div>

      <div
        ref={bandRef}
        className="relative mt-16 h-[16vw] min-h-[130px] overflow-hidden"
        aria-hidden="true"
      >
        <div
          ref={wordRef}
          onMouseEnter={handleWordHover}
          className="absolute -bottom-[6vw] left-[-1vw] cursor-default select-none whitespace-nowrap font-[family-name:var(--font-display)] font-medium uppercase leading-none tracking-tight [color:rgb(var(--text))]"
          style={{ fontSize: "clamp(4.5rem, 24vw, 32rem)" }}
        >
          NITO
          <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
            <Glitch trigger={rTrigger}>R</Glitch>
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-6 border-t px-6 py-6 [border-color:rgb(var(--hairline)/0.08)] sm:flex-row md:px-10">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span className="font-[family-name:var(--font-mono)] text-xs [color:rgb(var(--text-mute))]">
            &copy; {new Date().getFullYear()} Nitor
          </span>
          <span className="font-[family-name:var(--font-mono)] text-xs [color:rgb(var(--text-mute))]">
            Made to be kept.
          </span>
        </div>
        <FooterAttribution />
      </div>
    </footer>
  );
}

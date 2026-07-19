import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { ThemeProvider } from "@/state/theme";
import FeaturesPage from "@/app/features/page";
import PricingPage from "@/app/pricing/page";
import ChangelogPage from "@/app/changelog/page";
import RoadmapPage from "@/app/roadmap/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

// The six public content pages render the marketing frame directly, so these
// tests exercise the real MarketingNav and KineticFooter rather than stubs —
// the point is to prove the frame is present, not to mock it away. GSAP's
// scroll choreography is the one part stubbed out: it is dynamically imported
// inside an effect and has nothing to assert in jsdom.
vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    context: (fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    },
    set: vi.fn(),
    to: vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

// The theme toggle in MarketingNav reads the media query on mount.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
});

// The root layout wraps every route in ThemeProvider; MarketingNav's toggle
// depends on it, so the tests reproduce that rather than stubbing the toggle.
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: ThemeProvider });
}

const PAGES = [
  { route: "/features", name: "Features", Page: FeaturesPage },
  { route: "/pricing", name: "Pricing", Page: PricingPage },
  { route: "/changelog", name: "Changelog", Page: ChangelogPage },
  { route: "/roadmap", name: "Roadmap", Page: RoadmapPage },
  { route: "/privacy", name: "Privacy", Page: PrivacyPage },
  { route: "/terms", name: "Terms", Page: TermsPage },
] as const;

describe("public content pages — shared frame", () => {
  it.each(PAGES)("$route renders inside the public marketing frame", ({ Page }) => {
    render(<Page />);

    // MarketingNav is the <header>, KineticFooter the <footer>.
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();

    // The nav's home link is what makes the frame navigable while signed out.
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "Nitor home" }),
    ).toHaveAttribute("href", "/");
  });

  it.each(PAGES)("$route has exactly one h1 and it is not empty", ({ Page }) => {
    render(<Page />);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it.each(PAGES)("$route reaches the other public routes from its footer", ({ Page }) => {
    render(<Page />);

    // Every public destination must be a real route; a footer that still
    // pointed at "#" would strand a signed-out reader.
    const footer = within(screen.getByRole("contentinfo"));
    for (const link of footer.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toBe("#");
    }
  });
});

describe("public content pages — solo-maker voice", () => {
  // Nitor is built and operated by one person. Public copy must never adopt a
  // collective product voice ("we store…", "our servers", "email us"), because
  // it implies a company and a team that do not exist. Scoped to <main>: the
  // shared nav and footer are not owned by these pages.
  const COLLECTIVE = /\b(we|we'd|we'll|we're|we've|our|ours|ourselves|us)\b/i;

  it.each(PAGES)("$route uses no first-person plural in its copy", ({ Page }) => {
    render(<Page />);
    // Normalise typographic apostrophes so "we’re" is caught alongside "we're".
    const copy = (screen.getByRole("main").textContent ?? "").replace(/[’‘]/g, "'");

    const offenders = copy
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => COLLECTIVE.test(sentence));

    expect(offenders).toEqual([]);
  });

  it.each(PAGES)("$route claims no team or company identity", ({ Page }) => {
    render(<Page />);
    const copy = screen.getByRole("main").textContent ?? "";

    expect(copy).not.toMatch(/\bour team\b|\bthe team\b|\bNitor Inc\b|\bthe company\b/i);
  });
});

describe("public content pages — honesty invariants", () => {
  it("/features separates what works from what does not", () => {
    render(<FeaturesPage />);

    expect(screen.getByText("Available now")).toBeInTheDocument();
    expect(screen.getByText("Not yet")).toBeInTheDocument();
  });

  it("/features does not present the companion as an active feature", () => {
    const { container } = render(<FeaturesPage />);

    const nix = screen.getByRole("heading", { name: /Nix, the companion/i });
    expect(nix).toBeInTheDocument();
    // It lives under the "Not yet" list, tagged Deferred.
    expect(container.textContent).toContain("The habit companion is not active");
  });

  it("/pricing quotes no price and offers no checkout", () => {
    render(<PricingPage />);
    // Scoped to <main>: the footer's newsletter Subscribe button is part of
    // the shared frame and is not a pricing claim.
    const main = within(screen.getByRole("main"));
    const text = screen.getByRole("main").textContent ?? "";

    expect(text).toMatch(/free/i);
    // No currency figures, and none of the invented-tier vocabulary.
    expect(text).not.toMatch(/[$£€]\s?\d/);
    expect(text).not.toMatch(/per month|\/mo\b|billed annually|free trial|money-back/i);
    expect(main.queryByRole("button", { name: /subscribe|upgrade|buy|checkout/i })).toBeNull();
  });

  it("/changelog dates every entry and claims no release version", () => {
    const { container } = render(<ChangelogPage />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/18 Jul 2026/);
    expect(text).toMatch(/13 Jul 2026/);
    // Nitor has never cut a numbered release; saying so is the point.
    expect(text).toMatch(/has not cut a public release/i);
    expect(text).not.toMatch(/\bv\d+\.\d+/);
  });

  it("/roadmap defers the pet system, its persistence, and the final asset", () => {
    const { container } = render(<RoadmapPage />);
    const text = container.textContent ?? "";

    expect(screen.getByRole("heading", { name: /Nix, the habit companion/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Companion persistence/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /The final production asset/i }),
    ).toBeInTheDocument();
    expect(text).toMatch(/not part of the current phase/i);
  });

  it("/roadmap keeps committed work separate from exploratory ideas", () => {
    render(<RoadmapPage />);

    expect(screen.getByText("Now — in progress")).toBeInTheDocument();
    expect(screen.getByText("Next — committed")).toBeInTheDocument();
    expect(screen.getByText("Exploring — no commitment")).toBeInTheDocument();
  });

  it("/privacy describes real storage and makes no unverifiable guarantees", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";

    // Both halves of the actual behavior: browser-local prefs and per-account rows.
    expect(text).toMatch(/local storage/i);
    expect(text).toMatch(/row that belongs to a different account/i);
    // Claims we cannot substantiate must stay off the page.
    expect(text).not.toMatch(/end-to-end encrypt|encrypted at rest/i);
    expect(text).not.toMatch(/GDPR|HIPAA|SOC ?2|ISO ?27001/i);
    expect(text).not.toMatch(/within \d+ (days|hours)/i);
    expect(text).toMatch(/no compliance certification|holds no compliance/i);
  });

  it("/terms stays beta-scoped and invents no legal identity", () => {
    const { container } = render(<TermsPage />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/beta/i);
    // Bans the affirmative boilerplate only — the page deliberately *names*
    // these instruments in order to say it is not making them.
    expect(text).not.toMatch(/(is|are|shall be) governed by|binding arbitration/i);
    expect(text).not.toMatch(/exclusive jurisdiction|courts of/i);
    expect(text).not.toMatch(/\b(Inc\.|LLC|Ltd\.?|GmbH)\b/);
    expect(text).not.toMatch(/must be at least \d+ years/i);
    expect(text).toMatch(/will not find a company registration/i);
  });
});

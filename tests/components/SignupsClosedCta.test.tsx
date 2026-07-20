import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * The hero's primary CTA must not be able to send someone to a sign-up that
 * cannot succeed while SIGNUPS_OPEN is false.
 *
 * This is asserted from the RENDERED OUTPUT rather than from the flag, because
 * the failure being guarded is precisely a surface that stops reading the flag
 * — a dimmed-looking link that still navigates would satisfy any check of the
 * constant itself while remaining fully broken for the person who taps it.
 *
 * Both branches are exercised: the closed case is worthless without the open
 * case proving the link is real when the flag says it should be. Otherwise a
 * component that never renders a CTA at all would pass.
 */

// The nav pulls in the theme toggle and its store; neither is under test here,
// and the CTA assertions below are about anchors this stub cannot supply.
vi.mock("@/components/marketing/MarketingNav", () => ({
  MarketingNav: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.doUnmock("@/content/beta");
});

async function renderHeroWith(signupsOpen: boolean) {
  vi.resetModules();
  const actual = await vi.importActual<typeof import("@/content/beta")>(
    "@/content/beta",
  );
  vi.doMock("@/content/beta", () => ({ ...actual, SIGNUPS_OPEN: signupsOpen }));
  stubMatchMedia();
  const { Hero } = await import("@/components/marketing/Hero");
  render(<Hero />);
}

describe("hero CTA while sign-ups are closed", () => {
  it("offers no route to /signup and disables the button", async () => {
    await renderHeroWith(false);

    const cta = screen.getByRole("button", { name: "Start free" });
    expect(cta).toBeDisabled();
    expect(cta).not.toHaveAttribute("href");
    expect(document.querySelectorAll('a[href="/signup"]')).toHaveLength(0);
  });

  it("labels the disabled CTA as invite only", async () => {
    await renderHeroWith(false);
    expect(screen.getByText("Invite only")).toBeInTheDocument();
  });

  // Log in stays reachable: an invited tester's only way in is through it, so
  // closing sign-ups must not close the door behind them too.
  it("keeps the log-in link live", async () => {
    await renderHeroWith(false);
    expect(document.querySelector('a[href="/login"]')).not.toBeNull();
  });

  // The positive control. Without it, a Hero that rendered no CTA whatsoever
  // would satisfy every assertion above.
  it("restores a real /signup link once sign-ups open", async () => {
    await renderHeroWith(true);

    expect(document.querySelector('a[href="/signup"]')).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Start free" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Invite only")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KineticFooter } from "@/components/marketing/KineticFooter";

describe("KineticFooter links", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes every product and legal link to its public page", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );

    render(<KineticFooter />);

    const expectedRoutes = {
      Features: "/features",
      Pricing: "/pricing",
      Changelog: "/changelog",
      Roadmap: "/roadmap",
      Privacy: "/privacy",
      Terms: "/terms",
      Security: "/security",
    };

    for (const [label, href] of Object.entries(expectedRoutes)) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });
});

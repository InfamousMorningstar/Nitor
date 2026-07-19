import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SecurityPage from "@/app/security/page";

vi.mock("@/components/marketing/MarketingNav", () => ({
  MarketingNav: () => <nav aria-label="Marketing" />,
}));

vi.mock("@/components/marketing/KineticFooter", () => ({
  KineticFooter: () => <footer>Footer</footer>,
}));

describe("SecurityPage verification evidence", () => {
  it("separates numeric automated, browser, and model-assisted evidence", () => {
    const { container } = render(<SecurityPage />);

    expect(screen.getByRole("heading", { name: "Automated tests" })).toBeInTheDocument();
    expect(screen.getByText(/40 test files/i)).toBeVisible();
    expect(screen.getByText(/271 tests/i)).toBeVisible();
    expect(screen.getByText(/62 focused public-page and route-guard tests/i)).toBeVisible();
    expect(screen.getByText(/8 Codex-lane tests across 5 files/i)).toBeVisible();
    expect(screen.getByText(/4 repository contract tests/i)).toBeVisible();

    expect(screen.getByRole("heading", { name: "Live-browser checks" })).toBeInTheDocument();
    expect(screen.getByText(/seven public routes/i)).toBeVisible();
    expect(screen.getByText(/4\.60:1/i)).toBeVisible();

    expect(screen.getByRole("heading", { name: "Model-assisted review" })).toBeInTheDocument();
    expect(screen.getByText(/Claude Fable 5/i)).toBeVisible();
    expect(screen.getByText(/OpenAI Codex/i)).toHaveTextContent(
      "The persistence repository and its RLS boundary were independently reviewed with OpenAI Codex, including schema fidelity, ownership isolation, mutation safety, and field round-tripping.",
    );
    expect(screen.getByText(/not an independent human audit or certification/i)).toBeVisible();

    expect(screen.getByText(/zero findings/i)).toBeVisible();
    expect(screen.getByText(/four public tables/i)).toBeVisible();
    expect(screen.getByText(/every protected request is authorized/i)).toBeVisible();
    expect(screen.getByText(/every user-owned table denies cross-user access/i)).toBeVisible();
    expect(screen.getByText(/before authenticated persistence was introduced/i)).toBeVisible();
    expect(container).toHaveTextContent(/has not been independently audited or certified/i);
    expect(container).not.toHaveTextContent(/\b(?:we|our|us)\b/i);
  });
});

describe("SecurityPage heading outline", () => {
  it("has exactly one h1", () => {
    render(<SecurityPage />);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Built to be checked, not trusted.");
  });

  it("never skips a heading level in document order", () => {
    const { container } = render(<SecurityPage />);

    const levels = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
      Number(h.tagName[1]),
    );

    // Guards against the regression this test was written for: the control
    // ledger's group labels used to be <p class=eyebrow>, so the outline went
    // h1 → h3 at the first ControlRow.
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("labels each control group as an h2 above its h3 rows", () => {
    render(<SecurityPage />);

    for (const label of [
      "Identity & access",
      "Account protection",
      "Secrets & data",
      "Verification controls",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }

    // A control title stays an h3 nested under its group's h2.
    expect(
      screen.getByRole("heading", { level: 3, name: "Server-verified sessions" }),
    ).toBeInTheDocument();
  });
});

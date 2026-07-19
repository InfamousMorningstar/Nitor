import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { ScrollStory } from "@/components/marketing/ScrollStory";
import { WhyNitor } from "@/components/marketing/WhyNitor";

const heroSource = readFileSync(
  resolve(__dirname, "../../src/components/marketing/Hero.tsx"),
  "utf8",
);
const storySource = readFileSync(
  resolve(__dirname, "../../src/components/marketing/ScrollStory.tsx"),
  "utf8",
);

describe("marketing surfaces reflect the shipping product", () => {
  beforeEach(() => {
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
  });

  it("removes pet artwork from the hero and scroll story", () => {
    expect(heroSource).not.toMatch(/NixCreature|components\/pet/);
    expect(storySource).not.toMatch(/NixCreature|components\/pet/);
    expect(heroSource).toContain("Quiet momentum");
    expect(heroSource).toContain("Five of seven days completed this week");
  });

  it("replaces the scroll-story pet act with forgiving-streak evidence", () => {
    render(<ScrollStory />);

    expect(
      screen.getByRole("heading", { name: "A streak that knows the difference" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Grace day")).toBeInTheDocument();
    expect(screen.getByText("Streak intact")).toBeInTheDocument();
  });

  it("describes shipped streak mechanics without claiming an active companion", () => {
    const { container } = render(<WhyNitor />);
    const copy = container.textContent ?? "";

    expect(copy).toContain(
      "Momentum, grace days, and earned freezes reward consistency",
    );
    expect(copy).not.toMatch(/\b(Nix|pet|creature|companion)\b/i);
  });
});

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PetPage from "@/app/pet/page";

vi.mock("@/components/app/AppFrame", () => ({
  AppFrame: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-frame">{children}</div>
  ),
}));

describe("PetPage coming-soon state", () => {
  it("keeps the companion identity while deferring active pet controls", () => {
    const { container } = render(<PetPage />);

    expect(screen.getByTestId("app-frame")).toBeInTheDocument();
    expect(screen.getByText("Companion")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Pet" })).toBeInTheDocument();
    expect(screen.getByText(/Coming soon/)).toBeVisible();

    expect(screen.queryByRole("button", { name: /feed/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Evolution")).not.toBeInTheDocument();
    expect(screen.queryByText("Wardrobe")).not.toBeInTheDocument();
    expect(screen.queryByText("Memory log")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/\b(?:we|our|us)\b/i);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OnboardingPage from "@/app/onboarding/page";

// The onboarding page persists profiles.onboarding_completed on Finish and
// redirects already-onboarded users away. These tests pin that behavior by
// asserting the actual Supabase call arguments, not merely that a mock ran.
const { push, replace, eq, update, from, createClient, upsertHabit, setPetName } =
  vi.hoisted(() => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return {
      push: vi.fn(),
      replace: vi.fn(),
      eq,
      update,
      from,
      createClient: vi.fn(() => ({ from })),
      upsertHabit: vi.fn(() => Promise.resolve()),
      setPetName: vi.fn(),
    };
  });

// Mutable session the useSession mock returns; each test sets it in beforeEach.
let session: { user: { id: string } | null; profile: unknown };

vi.mock("@/lib/supabase/client", () => ({ createClient }));

vi.mock("@/state/SessionProvider", () => ({
  useSession: () => session,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/state/RepositoryProvider", () => ({
  useRepository: () => ({ upsertHabit }),
}));

vi.mock("@/state/settingsStore", () => ({
  useSettingsStore: (selector: (s: { setPetName: typeof setPetName }) => unknown) =>
    selector({ setPetName }),
}));

// Presentational only — keep the DOM light and free of canvas/animation.
vi.mock("@/components/pet/NixCreature", () => ({
  NixCreature: () => <div data-testid="nix" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  session = { user: { id: "user-1" }, profile: null };
});

// Walk from step 1 to the Finish button: pick a starter habit (required to
// advance from step 1), then Next → Next → Finish.
function walkToFinishAndClick() {
  fireEvent.click(screen.getByRole("button", { name: "Read 20 pages" }));
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
}

describe("OnboardingPage", () => {
  it("marks the profile complete for the signed-in user, then routes to /today", async () => {
    render(<OnboardingPage />);
    walkToFinishAndClick();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));

    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ onboarding_completed: true });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("redirects an already-onboarded user away from /onboarding", () => {
    session = { user: { id: "user-1" }, profile: { onboarding_completed: true } };
    render(<OnboardingPage />);

    expect(replace).toHaveBeenCalledWith("/today");
  });

  it("does not touch profiles and still routes to /today when there is no user", async () => {
    session = { user: null, profile: null };
    render(<OnboardingPage />);
    walkToFinishAndClick();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    expect(from).not.toHaveBeenCalled();
  });
});

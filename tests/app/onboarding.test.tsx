import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OnboardingPage from "@/app/onboarding/page";

// The onboarding page persists profiles.onboarding_completed on Finish and
// redirects already-onboarded users away. These tests pin that behavior by
// asserting the actual Supabase call arguments, not merely that a mock ran.
const {
  push,
  replace,
  maybeSingle,
  select,
  eq,
  update,
  from,
  createClient,
  upsertHabit,
  setPetName,
} = vi.hoisted(() => {
  // Mirrors the real chain: update().eq().select().maybeSingle(). Typed to the
  // supabase-js shape — an error is RETURNED, not thrown — and crucially the
  // `data` is what proves a row was actually written. A zero-row UPDATE comes
  // back as { data: null, error: null }.
  const maybeSingle = vi.fn(
    (): Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }> => Promise.resolve({ data: { id: "user-1" }, error: null }),
  );
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return {
    push: vi.fn(),
    replace: vi.fn(),
    maybeSingle,
    select,
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

  // The auth routes now gate every sign-in on onboarding_completed. A write
  // that fails is therefore not a lost preference — it is a permanent loop
  // back to this screen. These tests pin "keep the user here with a retry"
  // over the previous "navigate anyway", which that gate made harmful.
  describe("when the completion write fails", () => {
    it("keeps the user on the page and shows a retryable error (returned error)", async () => {
      // supabase-js RETURNS errors; it does not throw them. This is the case
      // the previous try/catch could never have caught.
      maybeSingle.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: "denied" } }));
      render(<OnboardingPage />);
      walkToFinishAndClick();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not save your setup/i,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("keeps the user on the page when the request rejects outright", async () => {
      maybeSingle.mockReturnValueOnce(Promise.reject(new Error("network down")));
      render(<OnboardingPage />);
      walkToFinishAndClick();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    // The quiet one. An UPDATE matching zero rows is NOT an error in
    // supabase-js — it returns { data: null, error: null }. A missing profile
    // row, RLS filtering the row out, or a future policy regression all look
    // exactly like this. Trusting `!error` reported success, navigated to
    // /today, and handed the user back to the post-auth gate on the next
    // sign-in: the silent permanent loop, reopened.
    it("treats a zero-row update as failure on Finish, despite error being null", async () => {
      maybeSingle.mockReturnValueOnce(Promise.resolve({ data: null, error: null }));
      render(<OnboardingPage />);
      walkToFinishAndClick();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not save your setup/i,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("treats a row belonging to someone else as failure", async () => {
      // Positive evidence means THIS user's row. Anything else is not proof.
      maybeSingle.mockReturnValueOnce(
        Promise.resolve({ data: { id: "someone-else" }, error: null }),
      );
      render(<OnboardingPage />);
      walkToFinishAndClick();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("asks for the written row back, so success can be proven and not assumed", async () => {
      render(<OnboardingPage />);
      walkToFinishAndClick();
      await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));

      expect(select).toHaveBeenCalledWith("id");
      expect(maybeSingle).toHaveBeenCalled();
    });

    it("re-enables Finish so the write can be retried", async () => {
      maybeSingle.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: "denied" } }));
      render(<OnboardingPage />);
      walkToFinishAndClick();
      await screen.findByRole("alert");

      const finish = screen.getByRole("button", { name: "Finish" });
      expect(finish).toBeEnabled();

      // The retry succeeds and the user finally leaves.
      fireEvent.click(finish);
      await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    });
  });

  // Skip declines the questions; it does not defer onboarding. Without the
  // write, the post-auth gate drags the user back here on every sign-in.
  describe("Skip", () => {
    it("marks onboarding complete before routing to /today", async () => {
      render(<OnboardingPage />);
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
      expect(from).toHaveBeenCalledWith("profiles");
      expect(update).toHaveBeenCalledWith({ onboarding_completed: true });
      expect(eq).toHaveBeenCalledWith("id", "user-1");
    });

    it("does not strand the user on a failed skip", async () => {
      maybeSingle.mockReturnValueOnce(Promise.resolve({ data: null, error: { message: "denied" } }));
      render(<OnboardingPage />);
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not skip setup/i,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("treats a zero-row update as failure on Skip too, despite error being null", async () => {
      maybeSingle.mockReturnValueOnce(Promise.resolve({ data: null, error: null }));
      render(<OnboardingPage />);
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /could not skip setup/i,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("guards against a double-click issuing two completion writes", async () => {
      render(<OnboardingPage />);
      const skip = screen.getByRole("button", { name: "Skip" });
      fireEvent.click(skip);
      fireEvent.click(skip);

      await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
      expect(update).toHaveBeenCalledTimes(1);
    });
  });
});

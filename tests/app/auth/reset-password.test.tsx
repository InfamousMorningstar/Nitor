import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

const { updateUser, push } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { updateUser },
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// AuthShell needs window.matchMedia and the settings store; the page logic
// under test does not. Render children straight through.
vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mocked Cloudflare registry only so the "no Turnstile here" pin below can
// observe that the page never renders a widget.
const turnstile = {
  render: vi.fn(() => "widget-1"),
  reset: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  updateUser.mockResolvedValue({ data: {}, error: null });
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
  window.turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
});

function fillForm(password = "long-enough-pw", confirm = password) {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirm },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
}

describe("ResetPasswordPage", () => {
  // Setting a password (unlike login's deliberate requiredError) must enforce
  // the full policy client-side, before any Supabase call (S10/V6).
  it("rejects a password shorter than 12 characters client-side without any Supabase call (S10/V6)", () => {
    render(<ResetPasswordPage />);
    fillForm("only10char"); // 10 chars < 12
    submit();

    expect(screen.getByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords without any Supabase call", () => {
    render(<ResetPasswordPage />);
    fillForm("long-enough-pw", "different-enough-pw");
    submit();

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and lands the recovered session on /today", async () => {
    render(<ResetPasswordPage />);
    fillForm("long-enough-pw");
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      password: "long-enough-pw",
    });
  });

  it("surfaces the server error and does not navigate on failure", async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth session missing!" },
    });
    render(<ResetPasswordPage />);
    fillForm("long-enough-pw");
    submit();

    expect(await screen.findByText("Auth session missing!")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("recovers the form if the update call throws (network-layer failure)", async () => {
    updateUser.mockRejectedValue(new Error("network down"));
    render(<ResetPasswordPage />);
    fillForm("long-enough-pw");
    submit();

    // Generic message shown, button re-enabled, no navigation.
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).not.toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  // The user arrives with a valid recovery session and updateUser is not a
  // CAPTCHA-protected endpoint — this page must not mount a widget.
  it("mounts no Turnstile widget", () => {
    render(<ResetPasswordPage />);
    expect(turnstile.render).not.toHaveBeenCalled();
  });
});

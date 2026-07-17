import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

const { resetPasswordForEmail } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { resetPasswordForEmail },
  })),
}));

// AuthShell needs window.matchMedia and the settings store; the page logic
// under test does not. Render children straight through.
vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Real <Turnstile> with a mocked Cloudflare registry, same as
// Turnstile.test.tsx — the churn bug lived in the widget lifecycle, and this
// page must not reintroduce it by remounting the widget subtree.
interface RenderOpts {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
}
let renderOpts: RenderOpts | null = null;
const turnstile = {
  render: vi.fn((_el: HTMLElement, opts: RenderOpts) => {
    renderOpts = opts;
    return "widget-1";
  }),
  reset: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  renderOpts = null;
  resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
  window.turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
});

function fillEmail(email = "sam@example.com") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

/**
 * Cloudflare invokes these callbacks from its own script, outside React's
 * event system — act() stands in for that here.
 */
function solveCaptcha(token = "tok-1") {
  act(() => renderOpts!.callback(token));
}

function failCaptcha() {
  act(() => renderOpts!["error-callback"]!());
}

describe("ForgotPasswordPage", () => {
  it("rejects an invalid email client-side without any Supabase call", () => {
    render(<ForgotPasswordPage />);
    fillEmail("not-an-email");
    solveCaptcha();
    submit();

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("blocks submit with no captcha token and explains why", () => {
    render(<ForgotPasswordPage />);
    fillEmail();
    submit();

    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  // This pins page-level behavior: the widget is rendered once and survives
  // re-renders as the user types, whatever the page's own render pattern is
  // (conditional rendering, a changing key, remounting the subtree, etc).
  // It does NOT prove the page's callbacks are stable — Turnstile's
  // latest-ref pattern ([] effect deps) tolerates unstable inline callbacks
  // by design, so this test would pass either way. That invariant is
  // guarded in tests/components/auth/Turnstile.test.tsx, not here.
  it("renders the widget once and does not remount it while the user types", () => {
    render(<ForgotPasswordPage />);
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "s" } });
    fireEvent.change(email, { target: { value: "sa" } });
    fireEvent.change(email, { target: { value: "sam" } });

    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).not.toHaveBeenCalled();
  });

  // Enumeration safety (page half): Supabase's resetPasswordForEmail returns
  // success whether or not the address has an account, and this page must not
  // add a branch of its own — the ONLY success copy is the deliberately
  // non-committal "If that email exists…". A page-level test cannot observe
  // "no branch on account existence" directly (the mock can't differ), so the
  // pin is: success shows exactly this copy, and failure (below) shows a
  // generic message that never echoes the server's reason.
  it("sends the reset email with the token and confirm redirect, then shows the neutral sent copy", async () => {
    render(<ForgotPasswordPage />);
    fillEmail();
    solveCaptcha("tok-1");
    submit();

    expect(
      await screen.findByText("If that email exists, a reset link is on its way."),
    ).toBeInTheDocument();
    expect(resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith(
      "sam@example.com",
      {
        captchaToken: "tok-1",
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      },
    );
  });

  it("shows a generic error on failure — never the raw server reason — and resets the spent token (S11)", async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    render(<ForgotPasswordPage />);
    fillEmail();
    solveCaptcha();
    submit();

    expect(
      await screen.findByText("Could not send the link. Try again."),
    ).toBeInTheDocument();
    // The raw Supabase message must not leak through — it could reveal
    // whether the account exists.
    expect(screen.queryByText("User not found")).not.toBeInTheDocument();
    // Tokens are single-use: the widget must be reset after a failed submit.
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");

    // The reset cleared the token, so an immediate retry without re-solving
    // must not silently reuse the spent one.
    resetPasswordForEmail.mockClear();
    submit();
    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("tells the user when the challenge itself cannot load (ad blocker)", () => {
    render(<ForgotPasswordPage />);
    failCaptcha();

    expect(
      screen.getByText(
        "Verification could not load. Disable your ad blocker or try another network.",
      ),
    ).toBeInTheDocument();
  });
});

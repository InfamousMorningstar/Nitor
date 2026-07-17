import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import SignupPage from "@/app/(auth)/signup/page";

const { signUp } = vi.hoisted(() => ({
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { signUp },
  })),
}));

// OAuthButtons (still stubbed, out of scope here) calls useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
// page must not reintroduce it by passing unstable callbacks.
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
  signUp.mockResolvedValue({ data: {}, error: null });
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
  window.turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
});

function fillForm(email = "sam@example.com", password = "longenough-pw") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
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

describe("SignupPage", () => {
  it("rejects a short password client-side without any Supabase call (S10/V6)", () => {
    render(<SignupPage />);
    fillForm("sam@example.com", "only10char"); // 10 chars < 12
    solveCaptcha();
    submit();

    expect(screen.getByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("blocks submit with no captcha token and explains why", () => {
    render(<SignupPage />);
    fillForm();
    submit();

    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("does not tear down the widget while the user types (stable callbacks)", () => {
    render(<SignupPage />);
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "s" } });
    fireEvent.change(email, { target: { value: "sa" } });
    fireEvent.change(email, { target: { value: "sam" } });

    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).not.toHaveBeenCalled();
  });

  it("signs up with the token and confirm redirect, then shows the sent state", async () => {
    render(<SignupPage />);
    fillForm();
    solveCaptcha("tok-1");
    submit();

    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(signUp).toHaveBeenCalledExactlyOnceWith({
      email: "sam@example.com",
      password: "longenough-pw",
      options: {
        captchaToken: "tok-1",
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });
    // The address the link went to, so the user knows where to look.
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
  });

  it("surfaces a server error and resets the spent token on failure (S11)", async () => {
    signUp.mockResolvedValue({
      data: {},
      error: { message: "User already registered" },
    });
    render(<SignupPage />);
    fillForm();
    solveCaptcha();
    submit();

    expect(
      await screen.findByText("User already registered"),
    ).toBeInTheDocument();
    // Tokens are single-use: the widget must be reset after a failed submit.
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");

    // The reset cleared the token, so an immediate retry without re-solving
    // must not silently reuse the spent one.
    signUp.mockClear();
    submit();
    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("tells the user when the challenge itself cannot load (ad blocker)", () => {
    render(<SignupPage />);
    failCaptcha();

    expect(
      screen.getByText(
        "Verification could not load. Disable your ad blocker or try another network.",
      ),
    ).toBeInTheDocument();
  });
});

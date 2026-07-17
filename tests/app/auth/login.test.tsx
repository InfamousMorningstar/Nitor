import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

const { signInWithPassword, push, refresh } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword },
  })),
}));

// The RAW query string each test wants the page to see. useSearchParams()
// hands components a URLSearchParams view of it, which applies exactly ONE
// percent-decode — the same as the real router.
let rawQuery = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(rawQuery),
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
  rawQuery = "";
  signInWithPassword.mockResolvedValue({ data: {}, error: null });
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
  window.turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
});

function fillForm(email = "sam@example.com", password = "hunter2-pass") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
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

describe("LoginPage", () => {
  it("rejects an empty password client-side without any Supabase call", () => {
    render(<LoginPage />);
    fillForm("sam@example.com", "");
    solveCaptcha();
    submit();

    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  // Login deliberately uses requiredError, NOT the 12-char passwordError:
  // accounts created before the current policy may hold shorter passwords
  // and must still be able to sign in.
  it("lets a legacy password shorter than 12 characters through to Supabase", async () => {
    render(<LoginPage />);
    fillForm("sam@example.com", "short-pw"); // 8 chars
    solveCaptcha();
    submit();

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledOnce());
  });

  it("blocks submit with no captcha token and explains why", () => {
    render(<LoginPage />);
    fillForm();
    submit();

    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  // This pins page-level behavior: the widget is rendered once and survives
  // re-renders as the user types, whatever the page's own render pattern is
  // (conditional rendering, a changing key, remounting the subtree, etc).
  // It does NOT prove the page's callbacks are stable — Turnstile's
  // latest-ref pattern ([] effect deps) tolerates unstable inline callbacks
  // by design, so this test would pass either way. That invariant is
  // guarded in tests/components/auth/Turnstile.test.tsx, not here.
  it("renders the widget once and does not remount it while the user types", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "s" } });
    fireEvent.change(email, { target: { value: "sa" } });
    fireEvent.change(email, { target: { value: "sam" } });

    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).not.toHaveBeenCalled();
  });

  it("signs in with the token and lands on /today when no next is given", async () => {
    render(<LoginPage />);
    fillForm();
    solveCaptcha("tok-1");
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: "sam@example.com",
      password: "hunter2-pass",
      options: { captchaToken: "tok-1" },
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("honours a validated ?next= path", async () => {
    rawQuery = "next=%2Fhabits";
    render(<LoginPage />);
    fillForm();
    solveCaptcha();
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/habits"));
  });

  it("falls back to /today for a hostile ?next= (S9)", async () => {
    rawQuery = "next=//evil.com";
    render(<LoginPage />);
    fillForm();
    solveCaptcha();
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
  });

  it("keeps a percent-encoded next verbatim — never decoded into an authority (S9)", async () => {
    // Raw query value %2F%252F%252Fevil.com; useSearchParams().get() decodes
    // it once to "/%2F%2Fevil.com", which safeNext admits. The redirect must
    // carry that string untouched: a second decode would yield "//evil.com".
    rawQuery = "next=%2F%252F%252Fevil.com";
    render(<LoginPage />);
    fillForm();
    solveCaptcha();
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/%2F%2Fevil.com"));
  });

  it("shows a generic error on failure — never revealing whether the account exists — and resets the spent token (S11)", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    render(<LoginPage />);
    fillForm();
    solveCaptcha();
    submit();

    expect(
      await screen.findByText("That email or password is not right."),
    ).toBeInTheDocument();
    // The raw Supabase message must not leak through.
    expect(screen.queryByText("Invalid login credentials")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // Tokens are single-use: the widget must be reset after a failed submit.
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");

    // The reset cleared the token, so an immediate retry without re-solving
    // must not silently reuse the spent one.
    signInWithPassword.mockClear();
    submit();
    expect(screen.getByText("Please complete the challenge.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("recovers the form if the auth call throws (network-layer failure)", async () => {
    signInWithPassword.mockRejectedValue(new Error("network down"));
    render(<LoginPage />);
    fillForm();
    solveCaptcha();
    submit();

    // Generic message shown, button re-enabled, spent token reset.
    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).not.toBeDisabled();
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");
    expect(push).not.toHaveBeenCalled();
  });

  it("tells the user when the challenge itself cannot load (ad blocker)", () => {
    render(<LoginPage />);
    failCaptcha();

    expect(
      screen.getByText(
        "Verification could not load. Disable your ad blocker or try another network.",
      ),
    ).toBeInTheDocument();
  });

  // /auth/confirm and /auth/callback bounce failures here as ?error=<code>.
  // Before this mapping the user landed on a silent login page with no hint
  // their confirmation or reset link had died.
  it("explains an expired or invalid link arriving as ?error=invalid_link", () => {
    rawQuery = "error=invalid_link";
    render(<LoginPage />);
    expect(
      screen.getByText("That link is invalid or has expired."),
    ).toBeInTheDocument();
  });

  it("never echoes an unknown ?error= value into the DOM", () => {
    rawQuery = "error=pwned%20by%20mallory";
    const { container } = render(<LoginPage />);
    expect(screen.queryByText(/pwned/)).not.toBeInTheDocument();
    // No alert renders at all for unrecognized codes.
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
  });

  it("has no magic-link path", () => {
    render(<LoginPage />);
    expect(
      screen.queryByText("Email me a magic link instead"),
    ).not.toBeInTheDocument();
  });
});

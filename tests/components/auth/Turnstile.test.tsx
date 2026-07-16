import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Turnstile } from "@/components/auth/Turnstile";

// The script tag never loads in jsdom, so window.turnstile is mocked and the
// component takes its "script already loaded" fast path. That is exactly the
// path where both real bugs lived: the widget lifecycle, not the network.
const turnstile = {
  render: vi.fn(() => "widget-1"),
  reset: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
  window.turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
});

/**
 * Inline arrows are the natural way to pass these props, so their identity
 * changes on every parent render — e.g. every keystroke in an auth form.
 * The widget must survive that, or any solved token is silently discarded.
 */
function InlineCallbackParent() {
  const [, setKeystrokes] = useState(0);
  return (
    <div>
      <button onClick={() => setKeystrokes((n) => n + 1)}>type</button>
      <Turnstile onToken={() => {}} onError={() => {}} />
    </div>
  );
}

function StableCallbackParent({
  onToken,
  onError,
}: {
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const [, setKeystrokes] = useState(0);
  return (
    <div>
      <button onClick={() => setKeystrokes((n) => n + 1)}>type</button>
      <Turnstile onToken={onToken} onError={onError} />
    </div>
  );
}

describe("Turnstile widget lifecycle", () => {
  it("does not tear down and rebuild the widget when inline callbacks change identity", () => {
    render(<InlineCallbackParent />);
    const type = screen.getByRole("button", { name: "type" });
    fireEvent.click(type);
    fireEvent.click(type);
    fireEvent.click(type);

    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).not.toHaveBeenCalled();
  });

  it("does not tear down and rebuild the widget with stable callbacks either", () => {
    render(<StableCallbackParent onToken={vi.fn()} onError={vi.fn()} />);
    const type = screen.getByRole("button", { name: "type" });
    fireEvent.click(type);
    fireEvent.click(type);
    fireEvent.click(type);

    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).not.toHaveBeenCalled();
  });

  it("removes the rendered widget exactly once on unmount", () => {
    const { unmount } = render(<Turnstile onToken={() => {}} />);
    expect(turnstile.render).toHaveBeenCalledTimes(1);

    unmount();
    expect(turnstile.remove).toHaveBeenCalledTimes(1);
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
  });

  it("renders an inert div and does nothing without a site key", () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { unmount } = render(<Turnstile onToken={() => {}} />);

    expect(turnstile.render).not.toHaveBeenCalled();
    // Unmounting with no rendered widget must not throw either.
    unmount();
    expect(turnstile.remove).not.toHaveBeenCalled();
  });
});

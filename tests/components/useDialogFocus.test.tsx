import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { useDialogFocus } from "@/components/a11y/useDialogFocus";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useDialogFocus({
    open,
    onClose: () => setOpen(false),
    containerRef: dialogRef,
    initialFocusRef,
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Test dialog">
          <input ref={initialFocusRef} aria-label="First field" />
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
}

describe("useDialogFocus", () => {
  it("moves focus into the dialog and restores it to the trigger after Escape", () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("textbox", { name: "First field" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("wraps Tab and Shift+Tab within the dialog", () => {
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const first = screen.getByRole("textbox", { name: "First field" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
});

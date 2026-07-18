"use client";
import { useRef, type ReactNode } from "react";
import { useDialogFocus } from "@/components/a11y/useDialogFocus";

/**
 * Right-side drawer for the habit builder — NOT a cramped modal. Slides in
 * from the right with a translate-x transition, matte surface panel
 * (~420px, full height), a plain dim backdrop (no blur), Esc + backdrop
 * click to close, and a focus trap while open.
 */
export function HabitDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus({ open, onClose, containerRef: panelRef });

  return (
    <div
      aria-hidden={!open}
      className={"fixed inset-0 z-50 " + (open ? "" : "pointer-events-none")}
    >
      {/* Backdrop — flat dim, no blur */}
      <div
        onClick={onClose}
        className={
          "absolute inset-0 bg-[rgb(0_0_0/0.5)] transition-opacity duration-[var(--dur)] [transition-timing-function:var(--ease)] " +
          (open ? "opacity-100" : "opacity-0")
        }
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={
          "absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l [border-color:rgb(var(--hairline)/0.08)] [background:rgb(var(--surface))] shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-[var(--dur)] [transition-timing-function:var(--ease)] " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between border-b px-6 py-5 [border-color:rgb(var(--hairline)/0.08)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight [color:rgb(var(--text))]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-lg [color:rgb(var(--text-dim))] transition-colors duration-[var(--dur-micro)] hover:[color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

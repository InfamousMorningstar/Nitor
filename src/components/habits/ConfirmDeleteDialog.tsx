"use client";

import { useId, useRef } from "react";
import type { Habit } from "@/domain/types";
import { useDialogFocus } from "@/components/a11y/useDialogFocus";

interface ConfirmDeleteDialogProps {
  habit: Habit | null;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  habit,
  value,
  onChange,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const open = habit !== null;

  useDialogFocus({
    open,
    onClose: onCancel,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  if (!habit) return null;

  const normalized = value.trim().toLowerCase();
  const canDelete = normalized === "delete" || normalized === habit.name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default [background:rgb(0_0_0/0.5)]"
        onClick={onCancel}
        aria-label="Cancel deleting habit"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border p-6 [border-color:rgb(var(--hairline)/0.12)] [background:rgb(var(--surface))] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
      >
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight [color:rgb(var(--text))]"
        >
          Delete {habit.name}?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed [color:rgb(var(--text-dim))]">
          This removes the habit and its history. Type “{habit.name}” or “delete” to confirm.
        </p>

        <label
          htmlFor="confirm-delete-habit"
          className="mt-5 block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] [color:rgb(var(--text-mute))]"
        >
          Confirmation
        </label>
        <input
          ref={inputRef}
          id="confirm-delete-habit"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none [border-color:rgb(var(--hairline)/0.16)] [background:rgb(var(--surface-2))] [color:rgb(var(--text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm [color:rgb(var(--text-dim))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={onConfirm}
            className="rounded-full px-4 py-2 text-sm font-medium [background:rgb(var(--accent))] [color:rgb(var(--accent-contrast))] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            Delete habit
          </button>
        </div>
      </div>
    </div>
  );
}

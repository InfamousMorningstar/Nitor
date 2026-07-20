"use client";

import { useEffect, useState } from "react";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import {
  emailError,
  fieldInput,
  fieldInputError,
  passwordError,
} from "@/components/auth/formKit";
import { createClient } from "@/lib/supabase/client";

const actionButton =
  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-micro)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] [border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text-dim))] hover:[border-color:rgb(var(--hairline)/0.24)] disabled:cursor-not-allowed disabled:opacity-50";
const statusClass = "max-w-[320px] text-right text-[11px] leading-snug";

export function EmailChangeControl({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("email_change") !== "confirmed") return;

    let active = true;
    queueMicrotask(() => {
      if (active) {
        setSuccess(
          "That confirmation was accepted. The email changes after all requested confirmations are accepted.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const validationError = submitted
    ? emailError(email) ??
      (email.trim().toLowerCase() === currentEmail.toLowerCase()
        ? "Enter a different email address."
        : undefined)
    : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(undefined);
    setSuccess(undefined);
    const nextEmail = email.trim();
    if (
      emailError(nextEmail) ||
      nextEmail.toLowerCase() === currentEmail.toLowerCase()
    ) {
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase.auth.updateUser(
        { email: nextEmail },
        { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      );
      if (updateError) {
        setError(updateError.message || "The email change could not be started.");
        return;
      }

      const returnedEmail = data.user?.email?.toLowerCase();
      const pendingEmail = data.user?.new_email?.toLowerCase();
      if (
        !data.user ||
        (returnedEmail !== nextEmail.toLowerCase() &&
          pendingEmail !== nextEmail.toLowerCase())
      ) {
        setError("The email change could not be verified. Nothing was reported as pending.");
        return;
      }

      setSuccess(
        `Supabase sent a confirmation to ${nextEmail}. If ${currentEmail} also receives one, open both to finish the change.`,
      );
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex w-full max-w-[360px] flex-col items-end gap-2" onSubmit={handleSubmit} noValidate>
      <label htmlFor="settings-email" className="sr-only">New email address</label>
      <div className="flex w-full items-center justify-end gap-2">
        <input
          id="settings-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={!!validationError}
          className={`${validationError ? fieldInputError : fieldInput} min-w-0 flex-1`}
        />
        <button type="submit" disabled={busy} className={actionButton}>
          {busy ? "Sending…" : "Change email"}
        </button>
      </div>
      <div className="w-full text-right"><FieldError message={validationError ?? error} /></div>
      {success && (
        <p role="status" className={`${statusClass} [color:rgb(var(--text-mute))]`}>
          {success}
        </p>
      )}
    </form>
  );
}

export function PasswordChangeControl({
  currentEmail,
  currentUserId,
}: {
  currentEmail: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const currentError = submitted && !currentPassword ? "Current password is required." : undefined;
  const newError = submitted ? passwordError(newPassword) : undefined;
  const confirmError =
    submitted && !newError && newPassword !== confirmPassword
      ? "Passwords don't match."
      : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(undefined);
    setSuccess(undefined);
    if (!currentPassword || passwordError(newPassword) || newPassword !== confirmPassword) return;

    setBusy(true);
    try {
      const supabase = createClient();
      // Re-authenticating proves knowledge of the current password, but it also
      // re-issues the session and consumes the project's sign-in rate limit.
      const { data: verified, error: verifyError } =
        await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        });
      if (verifyError) {
        setError("The current password is incorrect.");
        return;
      }
      if (verified.user?.id !== currentUserId) {
        setError("The current password could not be verified for this account.");
        return;
      }

      const { data: updated, error: updateError } =
        await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || "The password could not be updated.");
        return;
      }
      if (updated.user?.id !== currentUserId) {
        setError("The password update could not be verified.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSubmitted(false);
      setSuccess("Password updated.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button type="button" onClick={() => setOpen(true)} className={actionButton}>
          Change password
        </button>
        {success && <p role="status" className={`${statusClass} [color:rgb(var(--text-mute))]`}>{success}</p>}
      </div>
    );
  }

  return (
    <form className="w-full max-w-[360px] space-y-3" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="settings-current-password" className="sr-only">Current password</label>
        <input
          id="settings-current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          aria-invalid={!!currentError}
          className={currentError ? fieldInputError : fieldInput}
        />
        <FieldError message={currentError} />
      </div>
      <div>
        <label htmlFor="settings-new-password" className="sr-only">New password</label>
        <input
          id="settings-new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          aria-invalid={!!newError}
          className={newError ? fieldInputError : fieldInput}
        />
        <FieldError message={newError} />
        {newPassword && <PasswordStrengthBar password={newPassword} />}
      </div>
      <div>
        <label htmlFor="settings-confirm-password" className="sr-only">Confirm new password</label>
        <input
          id="settings-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          aria-invalid={!!confirmError}
          className={confirmError ? fieldInputError : fieldInput}
        />
        <FieldError message={confirmError} />
      </div>
      <FieldError message={error} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setSubmitted(false);
            setError(undefined);
          }}
          className={actionButton}
        >
          Cancel
        </button>
        <button type="submit" disabled={busy} className={actionButton}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </div>
      {success && <p role="status" className={`${statusClass} [color:rgb(var(--text-mute))]`}>{success}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, passwordError } from "@/components/auth/formKit";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);

  const passwordErr = submitted ? passwordError(password) : undefined;
  const confirmErr =
    submitted && !passwordErr && password !== confirmPassword ? "Passwords don't match." : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (passwordError(password) || password !== confirmPassword) return;
    // Stubbed — no real password update, no token handling.
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell>
        <p className={eyebrow}>Reset password</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Password updated
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          Your password has been changed. You can sign in with it now.
        </p>
        <Link href="/login" className={`${accentLink} mt-6 inline-block`}>
          &larr; Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className={eyebrow}>Reset password</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Choose a new password
      </h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="reset-password" className={`${eyebrow} mb-2 block`}>
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!passwordErr}
            className={passwordErr ? fieldInputError : fieldInput}
          />
          <FieldError message={passwordErr} />
          {password.length > 0 && !passwordErr && <PasswordStrengthBar password={password} />}
        </div>

        <div>
          <label htmlFor="reset-confirm" className={`${eyebrow} mb-2 block`}>
            Confirm password
          </label>
          <input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autoComplete="new-password"
            aria-invalid={!!confirmErr}
            className={confirmErr ? fieldInputError : fieldInput}
          />
          <FieldError message={confirmErr} />
        </div>

        <button type="submit" className={primaryButton}>
          Update password
        </button>
      </form>

      <p className="mt-8 text-center text-sm [color:rgb(var(--text-dim))]">
        <Link href="/login" className={accentLink}>
          &larr; Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

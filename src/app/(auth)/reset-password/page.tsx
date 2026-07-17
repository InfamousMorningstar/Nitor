"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { createClient } from "@/lib/supabase/client";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, passwordError } from "@/components/auth/formKit";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const passwordErr = submitted ? passwordError(password) : undefined;
  const confirmErr =
    submitted && !passwordErr && password !== confirmPassword ? "Passwords don't match." : undefined;

  // No Turnstile here: the user arrives with a valid recovery session (via
  // /auth/confirm) and updateUser is not a CAPTCHA-protected endpoint.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    // Setting a password (unlike login's check of an existing one) must
    // enforce the full 12-char policy client-side first (S10/V6).
    if (passwordError(password) || password !== confirmPassword) return;

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setServerError(error.message);
        return;
      }
      // The recovery session is a real signed-in session — land in the app.
      router.push("/today");
    } catch {
      // updateUser returns { error } for AuthErrors; a throw is a non-auth
      // (network-layer) failure.
      setServerError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
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

        <FieldError message={serverError} />

        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? "Updating…" : "Update password"}
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

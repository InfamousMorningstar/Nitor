"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { createClient } from "@/lib/supabase/client";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError } from "@/components/auth/formKit";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  const emailErr = submitted ? emailError(email) : undefined;

  // Turnstile's onError means the challenge can never be solved (script blocked
  // by an ad blocker or the network), which a null token cannot express. Without
  // surfacing it the user sees a form that rejects every submit and no visible
  // challenge. Must be a STABLE reference: pass a useCallback (or a plain state
  // setter), never an inline arrow.
  const handleCaptchaUnavailable = useCallback(() => {
    setServerError(
      "Verification could not load. Disable your ad blocker or try another network.",
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(undefined);
    if (emailError(email)) return;
    if (!captchaToken) {
      setServerError("Please complete the challenge.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        captchaToken,
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (error) {
        setServerError("Could not send the link. Try again.");
        return;
      }
      // The existing copy already says "If that email exists…" — keep it. Never
      // reveal whether an address has an account.
      setSent(true);
    } catch {
      // resetPasswordForEmail returns { error } for AuthErrors; a throw is a
      // non-auth (network-layer) failure. Keep it generic — and do NOT reveal
      // account existence.
      setServerError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      turnstile.current?.reset(); // single-use token (S11) — reset on every outcome
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <p className={eyebrow}>Reset password</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Check your email
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          If that email exists, a reset link is on its way.
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
        Forgot your password?
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
        Enter the email on your account and we&rsquo;ll send a link to reset it.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="forgot-email" className={`${eyebrow} mb-2 block`}>
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            aria-invalid={!!emailErr}
            className={emailErr ? fieldInputError : fieldInput}
          />
          <FieldError message={emailErr} />
        </div>

        <Turnstile
          ref={turnstile}
          onToken={setCaptchaToken}
          onError={handleCaptchaUnavailable}
        />
        <FieldError message={serverError} />

        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm [color:rgb(var(--text-dim))]">
        Remembered it?{" "}
        <Link href="/login" className={accentLink}>
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

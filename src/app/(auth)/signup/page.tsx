"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { createClient } from "@/lib/supabase/client";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError, passwordError } from "@/components/auth/formKit";
import { signUpErrorMessage } from "@/components/auth/errorCopy";
import { BETA_SIGNUP_CLOSED_LINE, BETA_SIGNUP_NOTICE } from "@/content/beta";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  const emailErr = submitted ? emailError(email) : undefined;
  const passwordErr = submitted ? passwordError(password) : undefined;

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
    if (emailError(email) || passwordError(password)) return;
    if (!captchaToken) {
      setServerError("Please complete the challenge.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
        },
      });

      if (error) {
        // Mapped to Nitor's own copy — a raw error.message here would leak
        // "User already registered" if email confirmation were ever disabled.
        setServerError(signUpErrorMessage(error));
        return;
      }
      setSent(true);
    } catch {
      // signUp returns { error } for every AuthError; a throw here is a non-auth
      // failure (network layer), so keep the message generic.
      setServerError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      // The token is spent whether or not the call succeeded (S11).
      turnstile.current?.reset();
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <p className={eyebrow}>Almost there</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Check your email
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          A confirmation link was sent to{" "}
          <span className="[color:rgb(var(--text))]">{email}</span>. Open it to
          finish setting up your account.
        </p>
        <Link href="/login" className={`${accentLink} mt-6 inline-block`}>
          &larr; Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className={eyebrow}>Start your streak</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Create an account
      </h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="signup-email" className={`${eyebrow} mb-2 block`}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!emailErr}
            className={emailErr ? fieldInputError : fieldInput}
          />
          <FieldError message={emailErr} />
        </div>

        <div>
          <label htmlFor="signup-password" className={`${eyebrow} mb-2 block`}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autoComplete="new-password"
            aria-invalid={!!passwordErr}
            className={passwordErr ? fieldInputError : fieldInput}
          />
          <FieldError message={passwordErr} />
          {password.length > 0 && !passwordErr && <PasswordStrengthBar password={password} />}
        </div>

        <Turnstile
          ref={turnstile}
          onToken={setCaptchaToken}
          onError={handleCaptchaUnavailable}
        />
        <FieldError message={serverError} />

        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>

        <p className="text-center text-xs font-medium [color:rgb(var(--text-dim))]">
          {BETA_SIGNUP_CLOSED_LINE}
        </p>

        <p className="text-center text-xs leading-relaxed [color:rgb(var(--text-mute))]">
          {BETA_SIGNUP_NOTICE}
        </p>
      </form>

      <p className="mt-8 text-center text-sm [color:rgb(var(--text-dim))]">
        Already have an account?{" "}
        <Link href="/login" className={accentLink}>
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

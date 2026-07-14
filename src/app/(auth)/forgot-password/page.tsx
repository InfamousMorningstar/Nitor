"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError } from "@/components/auth/formKit";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);

  const emailErr = submitted ? emailError(email) : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (emailError(email)) return;
    // Stubbed — no email is actually sent.
    setSent(true);
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

        <button type="submit" className={primaryButton}>
          Send reset link
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

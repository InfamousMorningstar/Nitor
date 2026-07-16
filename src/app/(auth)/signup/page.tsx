"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { FieldError } from "@/components/auth/FieldError";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError, passwordError } from "@/components/auth/formKit";
import { BETA_SIGNUP_NOTICE } from "@/content/beta";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailErr = submitted ? emailError(email) : undefined;
  const passwordErr = submitted ? passwordError(password) : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (emailError(email) || passwordError(password)) return;
    // Stubbed — no real account is created, just route into onboarding.
    router.push("/onboarding");
  }

  return (
    <AuthShell>
      <p className={eyebrow}>Start your streak</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Create an account
      </h1>

      <div className="mt-8">
        <OAuthButtons redirectTo="/onboarding" />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 [background:rgb(var(--hairline)/0.1)]" />
        <span className={eyebrow}>or</span>
        <div className="h-px flex-1 [background:rgb(var(--hairline)/0.1)]" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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

        <button type="submit" className={primaryButton}>
          Create account
        </button>

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

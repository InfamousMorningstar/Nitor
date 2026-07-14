"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { FieldError } from "@/components/auth/FieldError";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError, requiredError } from "@/components/auth/formKit";

type Mode = "password" | "magic-sent";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<Mode>("password");

  const emailErr = submitted ? emailError(email) : undefined;
  const passwordErr = submitted ? requiredError(password, "Password") : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (emailError(email) || requiredError(password, "Password")) return;
    // Stubbed — no real auth call, just route into the app.
    router.push("/today");
  }

  function handleMagicLink() {
    setSubmitted(true);
    if (emailError(email)) return;
    setMode("magic-sent");
  }

  if (mode === "magic-sent") {
    return (
      <AuthShell>
        <p className={eyebrow}>Magic link</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
          Check your email
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
          We sent a sign-in link to <span className="[color:rgb(var(--text))]">{email}</span>. Open
          it on this device to continue.
        </p>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`${accentLink} mt-6 inline-block`}
        >
          &larr; Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className={eyebrow}>Welcome back</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Log in
      </h1>

      <div className="mt-8">
        <OAuthButtons redirectTo="/today" />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 [background:rgb(var(--hairline)/0.1)]" />
        <span className={eyebrow}>or</span>
        <div className="h-px flex-1 [background:rgb(var(--hairline)/0.1)]" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="login-email" className={`${eyebrow} mb-2 block`}>
            Email
          </label>
          <input
            id="login-email"
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
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className={eyebrow}>
              Password
            </label>
            <Link href="/forgot-password" className={accentLink}>
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            autoComplete="current-password"
            aria-invalid={!!passwordErr}
            className={passwordErr ? fieldInputError : fieldInput}
          />
          <FieldError message={passwordErr} />
        </div>

        <button type="submit" className={primaryButton}>
          Log in
        </button>

        <button type="button" onClick={handleMagicLink} className={`${accentLink} block w-full text-center`}>
          Email me a magic link instead
        </button>
      </form>

      <p className="mt-8 text-center text-sm [color:rgb(var(--text-dim))]">
        New to Nitor?{" "}
        <Link href="/signup" className={accentLink}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

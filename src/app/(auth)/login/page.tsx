"use client";
import { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError } from "@/components/auth/FieldError";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/redirect";
import { postAuthDestination } from "@/lib/auth/onboarding";
import { eyebrow, fieldInput, fieldInputError, primaryButton, accentLink, emailError, requiredError } from "@/components/auth/formKit";
import { authLinkErrorMessage } from "@/components/auth/errorCopy";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // /auth/confirm and /auth/callback land here with ?error= when a link is
  // expired or an exchange fails; without this the user sees a silent login
  // page. Whitelist-mapped — an unknown value renders nothing, never echoed.
  const [serverError, setServerError] = useState<string | undefined>(() =>
    authLinkErrorMessage(searchParams.get("error")),
  );
  const [busy, setBusy] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  const emailErr = submitted ? emailError(email) : undefined;
  const passwordErr = submitted ? requiredError(password, "Password") : undefined;

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
    if (emailError(email) || requiredError(password, "Password")) return;
    if (!captchaToken) {
      setServerError("Please complete the challenge.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (error) {
        // Deliberately generic: never reveal whether the address has an account.
        setServerError("That email or password is not right.");
        return;
      }

      // safeNext rejects attacker-supplied absolute/protocol-relative targets (S9),
      // and postAuthDestination decides whether this user has earned that
      // destination yet. Password login used to push straight to `next`, which
      // meant it was the ONE authenticated entry point that skipped the
      // onboarding gate — a first-time user landed on an empty /today instead of
      // onboarding. That is also the only path a beta tester can use while
      // transactional email cannot reach them, so it was the common case, not
      // the edge case. Gate at every point authentication succeeds, not most.
      const destination = await postAuthDestination(
        supabase,
        safeNext(searchParams.get("next")),
      );
      router.push(destination);
      router.refresh();
    } catch {
      // signInWithPassword returns { error } for every AuthError; a throw here is
      // a non-auth failure (network layer). Not a credentials problem, so keep the
      // message generic rather than reusing the returned-error copy.
      setServerError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      turnstile.current?.reset(); // single-use token (S11)
    }
  }

  return (
    <AuthShell>
      <p className={eyebrow}>Welcome back</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Log in
      </h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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

        <Turnstile
          ref={turnstile}
          onToken={setCaptchaToken}
          onError={handleCaptchaUnavailable}
        />
        <FieldError message={serverError} />

        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
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

// useSearchParams() requires a Suspense boundary during static rendering —
// without one, `next build` fails on this page.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

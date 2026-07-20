import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { postAuthDestination } from "@/lib/auth/onboarding";

/**
 * Handles signup-confirmation and password-recovery links. The email
 * templates must point here — see Task 18.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  // Recovery links must land on the password form, not the app — and not on
  // onboarding either. Someone resetting a password has one job, and the
  // onboarding gate still catches them on the next navigation.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Email changes belong to account settings, but completing one must not
  // bypass the same onboarding gate as every other authenticated destination.
  if (type === "email_change") {
    const destination = await postAuthDestination(
      supabase,
      "/settings?email_change=confirmed",
    );
    return NextResponse.redirect(`${origin}${destination}`);
  }

  // Everything else is a confirmation that may be this user's first sign-in.
  const destination = await postAuthDestination(supabase, next);
  return NextResponse.redirect(`${origin}${destination}`);
}

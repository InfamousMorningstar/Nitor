import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { postAuthDestination } from "@/lib/auth/onboarding";

/**
 * PKCE code exchange. Any flow that returns an authorization code lands here —
 * email confirmation links and invites today, plus any provider enabled later.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // A first sign-in through this route may carry no onboarding destination of
  // its own, so the profile decides — not the link.
  const destination = await postAuthDestination(supabase, next);
  return NextResponse.redirect(`${origin}${destination}`);
}

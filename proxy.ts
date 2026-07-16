import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/** Routes reachable while logged out. Everything else requires a session. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
]);

/** Logged-in users have no business here. */
const AUTH_ONLY_PATHS = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Redirects must carry the refreshed cookies, or the session is lost on the
  // very request that establishes it.
  function redirectTo(pathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (!claims && !PUBLIC_PATHS.has(pathname)) {
    return redirectTo("/login", `?next=${encodeURIComponent(pathname)}`);
  }

  if (claims && AUTH_ONLY_PATHS.has(pathname)) {
    return redirectTo("/today");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

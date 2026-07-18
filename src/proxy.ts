import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/** Routes reachable while logged out. Everything else requires a session. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  // Public marketing/content pages. Each renders the MarketingNav +
  // KineticFooter frame and must stay reachable while signed out, or the
  // footer links dead-end at /login.
  "/features",
  "/pricing",
  "/changelog",
  "/roadmap",
  "/privacy",
  "/terms",
  "/security",
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
    // S8. If the token refresh set anti-caching headers on `response`, this
    // redirect carries the same Set-Cookie payload and needs them too. Copied
    // explicitly (not response.headers wholesale) so Next's internal
    // middleware control headers on the pass-through response can never
    // contradict the redirect's own Location/status semantics.
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value !== null) redirect.headers.set(header, value);
    }
    return redirect;
  }

  if (!claims && !PUBLIC_PATHS.has(pathname)) {
    // Preserve the full original destination, query string included.
    return redirectTo(
      "/login",
      `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`,
    );
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

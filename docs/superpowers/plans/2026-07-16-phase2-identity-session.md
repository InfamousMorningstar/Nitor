# Phase 2 Slice 1 — Identity & Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Nitor's stubbed auth with real Supabase identity — cookie-based sessions, a `proxy.ts` route guard, email/password + Google sign-in, and a `profiles` table behind RLS.

**Architecture:** `@supabase/ssr` issues three thin clients (browser, server, session-refresh). Sessions ride in HTTP-only cookies refreshed by `src/proxy.ts` on every request; that same proxy is the authorization boundary and uses `getClaims()` to verify the JWT signature. A `profiles` table keyed to `auth.users` holds display name and the onboarding flag, protected by deny-by-default RLS. Habit data is untouched this slice — `MockHabitRepository` stays in memory.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript, Supabase (Auth + Postgres), `@supabase/ssr`, Cloudflare Turnstile, Vitest 4, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-07-16-phase2-identity-session-design.md`. Read it first.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **S1** — Never trust `getSession()` in server code. All server-side authorization uses `getClaims()`. `getUser()` only where fresh user data is needed (it costs a network call).
- **S2** — Use publishable (`sb_publishable_…`) and secret (`sb_secret_…`) keys. Never legacy `anon`/`service_role`.
- **S3** — Publishable keys go in the `apikey` header **only** — never `Authorization: Bearer`.
- **S4** — The secret key never enters the repo. `.env.local` confirmed gitignored *before* any key is written. Never referenced from a `NEXT_PUBLIC_*` variable.
- **S5** — `user_metadata` never backs an RLS policy or a trust decision.
- **S6** — RLS enabled on every table in the `public` schema, deny-by-default.
- **S7** — `security definer` functions pin `search_path = ''` and fully qualify every reference.
- **S8** — `setAll` applies `Cache-Control`, `Expires`, `Pragma`. In Server Components `setAll` is wrapped in try/catch. **Verified against installed @supabase/ssr 0.12.3:** `SetAllCookies` is `(cookies, headers: Record<string,string>) => …` — the library supplies these headers; apply them rather than hardcoding. The **proxy is the only place they can land**, because the server client writes through Next's `cookies()` store, which cannot set response headers.
- **S9** — `?next=` accepts only same-origin relative paths matching `/^\/(?!\/)/`. Anything else falls back to `/today`.
- **S10** — Supabase password minimum 12 **and** `passwordError()` updated to match. Leaked-password protection enabled.
- **S11** — Turnstile on login, signup, **and** forgot-password. CAPTCHA applies to all auth endpoints, not just signup.
- **S12** — `get_advisors` returns zero security findings before merge.

**Ship gate:** Slice 1 must **not** be deployed publicly on its own. Merge to `main` and wait for slice 2.

**Code conventions:** This codebase uses Tailwind bracket syntax (`[color:rgb(var(--text))]`) throughout — match it, do not "canonicalise". Reuse tokens from `src/components/auth/formKit.ts`. No new visual language.

---

## Blocked-by-domain notice

The app domain is **not yet registered** (spec: "Deployment parameters"). Consequences:

- **Tasks 1–17 are all implementable now.** None require the final domain.
- **Task 18 (custom SMTP + DNS) is BLOCKED until the domain exists.** Until then, development uses the Supabase project's built-in SMTP, which is rate-limited to a few emails/hour — enough to test the flow with *your own* address, not enough to ship.
- **Task 19's V7 runs twice:** once in dev against built-in SMTP, once again after Task 18 before any public deploy.

Do not let the missing domain block the code. Do not let it be forgotten before ship.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `supabase/profiles.sql` | profiles table, RLS policies, signup trigger |
| `src/lib/supabase/client.ts` | browser Supabase client factory |
| `src/lib/supabase/server.ts` | server Supabase client factory (RSC / routes / actions) |
| `src/lib/supabase/session.ts` | session refresh + claims for the proxy |
| `src/proxy.ts` | route guard + session refresh (Next.js file convention — **`src/`, not the repo root**, because this project has a `src/` directory; see Task 7) |
| `src/lib/auth/redirect.ts` | `safeNext()` open-redirect validator |
| `src/app/auth/callback/route.ts` | PKCE code exchange (Google OAuth) |
| `src/app/auth/confirm/route.ts` | email confirmation / recovery `verifyOtp` |
| `src/components/auth/Turnstile.tsx` | Turnstile widget wrapper |
| `src/state/SessionProvider.tsx` | client session + profile context |
| `.env.example` | documented env var names (no values) |
| `tests/lib/redirect.test.ts` | `safeNext` unit tests (V5) |
| `tests/components/auth/formKit.test.ts` | `passwordError` unit tests (V6) |

**Modify:** `package.json`, `.gitignore`, `src/components/auth/formKit.ts`, `src/components/auth/OAuthButtons.tsx`, `src/app/(auth)/{signup,login,forgot-password,reset-password}/page.tsx`, `src/app/onboarding/page.tsx`, `src/components/nav/Sidebar.tsx`, `src/data/quotes/remote.ts`, `src/app/layout.tsx`.

---

## Task 1: Dependencies, env scaffolding, gitignore

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: nothing
- Produces: `@supabase/ssr` + `@supabase/supabase-js` available; documented env var names.

- [ ] **Step 1: Verify `.env.local` is gitignored BEFORE writing any key (S4)**

Run:
```bash
git check-ignore -v .env.local
```
Expected: a line naming `.gitignore` and the `.env*` rule. If this prints **nothing**, STOP — the file is not ignored, and no key may be written until it is.

- [ ] **Step 2: Allow `.env.example` past the `.env*` rule**

The current `.gitignore` has `.env*`, which also ignores the example file we want committed. Add immediately after the `.env*` line:

```gitignore
!.env.example
```

- [ ] **Step 3: Verify the exception works**

Run:
```bash
git check-ignore -v .env.example; echo "exit=$?"
```
Expected: no output, `exit=1` (not ignored). `.env.local` must still be ignored — re-run Step 1 to confirm.

- [ ] **Step 4: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 5: Create `.env.example`** (names only — never values)

```bash
# Supabase — publishable key is safe in the browser; secret key is NOT.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Server-only. Never prefix with NEXT_PUBLIC_. Never commit a real value.
SUPABASE_SECRET_KEY=

# Cloudflare Turnstile. The SECRET half is configured in the Supabase
# dashboard (Auth -> Bot and Abuse Protection), not here.
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

- [ ] **Step 6: Verify the build still passes**

```bash
npm run build
```
Expected: build succeeds (adding deps changes nothing yet).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: add supabase ssr deps and env scaffolding"
```

---

## Task 2: Provision the Supabase project (manual)

**Files:** none (dashboard + `.env.local`)

**Interfaces:**
- Consumes: Task 1's `.env.example`
- Produces: a live project; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` in `.env.local`.

- [ ] **Step 1: Re-confirm `.env.local` is ignored (S4)**

```bash
git check-ignore -v .env.local
```
Expected: matches `.env*`. Do not proceed otherwise.

- [ ] **Step 2: Create the project**

Supabase dashboard → New project. Record the project ref and region. Choose a region near your users.

- [ ] **Step 3: Enable asymmetric JWT signing keys**

Dashboard → Authentication → Signing Keys → migrate to an asymmetric key (ECC recommended).
This is what lets `getClaims()` verify signatures locally against published public keys instead of making a network call per request (S1).

- [ ] **Step 4: Create publishable + secret API keys (S2)**

Dashboard → Settings → API Keys → create `sb_publishable_…` and `sb_secret_…`. Legacy `anon`/`service_role` keys remain but are **not** used by new code.

- [ ] **Step 5: Write `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

- [ ] **Step 6: Verify the secret key is not tracked (V3)**

```bash
git status --short
git grep -n "sb_secret_" -- . ':!*.md' || echo "clean"
```
Expected: `.env.local` does **not** appear in `git status`; the grep prints `clean`.

- [ ] **Step 7: No commit** — nothing tracked changed. Confirm with `git status --short`.

---

## Task 3: profiles table, RLS, and signup trigger

**Files:**
- Create: `supabase/profiles.sql`

**Interfaces:**
- Consumes: Task 2's project
- Produces: `public.profiles(id uuid, display_name text, onboarding_completed boolean, created_at timestamptz)` with RLS; a row auto-created per signup.

- [ ] **Step 1: Write `supabase/profiles.sql`**

```sql
-- Nitor profiles: one row per auth user. Created automatically on signup by
-- the trigger below. Phase 2 slice 1 (identity & session).
--
-- Why a table instead of user_metadata: user_metadata is writable by the
-- authenticated user from the client, so it can never back a trust decision
-- such as onboarding_completed (S5).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Deny-by-default: only the two policies below open anything up. There is
-- deliberately no insert policy (the trigger owns creation) and no delete
-- policy (delete cascades from auth.users).
--
-- `(select auth.uid())` rather than bare `auth.uid()` so the planner
-- evaluates it once per statement as an initPlan instead of once per row.
--
-- `create policy` has no `if not exists` form, so each policy is dropped
-- first. Without this the whole file aborts on a re-run (42710) — and an
-- edited function body below would then never be applied.

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- security definer so it can insert into a table the new user cannot yet see.
-- `set search_path = ''` is mandatory: a definer function with a mutable
-- search path lets a caller shadow an unqualified name and run code as the
-- function owner. Every reference below is therefore fully qualified (S7).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- raw_user_meta_data is user-controlled input. Safe as a display string
    -- (React escapes on render); never used for authorization. Length-capped.
    left(new.raw_user_meta_data ->> 'display_name', 60)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply it**

Dashboard → SQL Editor → paste and run. (Or `apply_migration` via the Supabase MCP.)
Expected: success, no errors.

- [ ] **Step 3: Apply the queued quotes schema while you're here**

`supabase/quotes.sql` has been waiting since Phase 1 and is unblocked now that a project exists. Run it the same way, then seed:

```bash
npx tsx scripts/seed-quotes.ts
```
Expected: 58 quotes upserted. Note `seed-quotes.ts` may reference `SUPABASE_SERVICE_ROLE_KEY`; if so, update it to read `SUPABASE_SECRET_KEY` (S2) before running.

- [ ] **Step 4: Run the security advisor (V1, S12)**

Dashboard → Advisors → Security. (Or `get_advisors` with `type: "security"` via MCP.)
Expected: **zero** security findings. A "Function Search Path Mutable" finding means Step 1's `set search_path = ''` was dropped — fix and re-run.

- [ ] **Step 5: Negative RLS test (V2) — the important one**

RLS filters silently: an unauthorized read returns **0 rows**, not an error. That is why this must be observed rather than assumed.

1. Create two users (dashboard → Authentication → Add user): `a@example.com`, `b@example.com`.
2. Confirm both have a `profiles` row: SQL Editor → `select id, onboarding_completed from public.profiles;` → expect 2 rows (this also proves the trigger fired).
3. In the SQL Editor, impersonate user B (role selector → `authenticated`, set the user to B) and run:

```sql
select * from public.profiles where id = '<user-A-uuid>';
```
Expected: **0 rows**. If it returns user A's row, the policy is wrong — stop and fix before continuing.

4. Still as B, confirm B *can* see B: `select * from public.profiles;` → expect exactly 1 row (B's).

- [ ] **Step 6: Commit**

```bash
git add supabase/profiles.sql
git commit -m "feat(db): profiles table with RLS and signup trigger"
```

---

## Task 4: `safeNext` open-redirect validator (S9, V5)

**Files:**
- Create: `src/lib/auth/redirect.ts`
- Test: `tests/lib/redirect.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `safeNext(next: string | null | undefined, fallback?: string): string` — used by `proxy.ts` and both auth route handlers.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/redirect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/redirect";

describe("safeNext", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeNext("/today")).toBe("/today");
    expect(safeNext("/habits")).toBe("/habits");
  });

  it("preserves a query string", () => {
    expect(safeNext("/habits?tab=archive")).toBe("/habits?tab=archive");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNext("//evil.com")).toBe("/today");
  });

  it("rejects absolute URLs", () => {
    expect(safeNext("https://evil.com")).toBe("/today");
    expect(safeNext("http://evil.com")).toBe("/today");
  });

  it("rejects backslash tricks browsers may normalise to //", () => {
    expect(safeNext("/\\evil.com")).toBe("/today");
    expect(safeNext("\\\\evil.com")).toBe("/today");
  });

  it("rejects scheme-like values", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/today");
  });

  it("falls back on empty and missing values", () => {
    expect(safeNext(null)).toBe("/today");
    expect(safeNext(undefined)).toBe("/today");
    expect(safeNext("")).toBe("/today");
  });

  it("honours an explicit fallback", () => {
    expect(safeNext(null, "/settings")).toBe("/settings");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/lib/redirect.test.ts
```
Expected: FAIL — cannot resolve `@/lib/auth/redirect`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth/redirect.ts`:

```ts
/**
 * Open-redirect guard for `?next=` (S9).
 *
 * Only same-origin relative paths are allowed through. Everything else — an
 * absolute URL, a protocol-relative `//evil.com`, or a backslash form some
 * browsers normalise to `//` — falls back. An attacker who controls `next`
 * otherwise gets to bounce a freshly-authenticated user to a site they own.
 */
const SAFE_NEXT = /^\/(?!\/)[^\\\s]*$/;

export function safeNext(
  next: string | null | undefined,
  fallback = "/today",
): string {
  if (!next) return fallback;
  return SAFE_NEXT.test(next) ? next : fallback;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run tests/lib/redirect.test.ts
```
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/redirect.ts tests/lib/redirect.test.ts
git commit -m "feat(auth): add safeNext open-redirect guard"
```

---

## Task 5: Password policy parity (S10, V6)

**Files:**
- Modify: `src/components/auth/formKit.ts:45`
- Test: `tests/components/auth/formKit.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `passwordError(value: string, minLength?: number): string | undefined` with a default minimum of **12**.

Both callers (`signup/page.tsx`, `reset-password/page.tsx`) call `passwordError(password)` with no explicit minimum, so changing the default covers both. `passwordError` has **no test coverage today** — this task adds it.

- [ ] **Step 1: Write the failing test**

Create `tests/components/auth/formKit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { passwordError, emailError } from "@/components/auth/formKit";

describe("passwordError", () => {
  it("requires a password", () => {
    expect(passwordError("")).toBe("Password is required.");
  });

  it("rejects a 10-character password client-side (S10 parity)", () => {
    expect(passwordError("abcdefghij")).toBe("Use at least 12 characters.");
  });

  it("rejects 11 characters", () => {
    expect(passwordError("abcdefghijk")).toBe("Use at least 12 characters.");
  });

  it("accepts exactly 12 characters", () => {
    expect(passwordError("abcdefghijkl")).toBeUndefined();
  });

  it("still honours an explicit minimum", () => {
    expect(passwordError("abcdefgh", 8)).toBeUndefined();
  });
});

describe("emailError", () => {
  it("requires an email", () => {
    expect(emailError("")).toBe("Email is required.");
  });

  it("rejects a malformed email", () => {
    expect(emailError("nope")).toBe("Enter a valid email address.");
  });

  it("accepts a valid email", () => {
    expect(emailError("a@b.co")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/components/auth/formKit.test.ts
```
Expected: FAIL — `passwordError("abcdefghij")` returns `undefined` (current default is 8).

- [ ] **Step 3: Change the default**

In `src/components/auth/formKit.ts`, replace:

```ts
export function passwordError(value: string, minLength = 8): string | undefined {
```

with:

```ts
/**
 * Minimum 12 to match the Supabase project's password policy (S10). A lower
 * value here means a password the form accepts and the API rejects, surfacing
 * as a raw server error instead of Nitor's own message.
 */
export function passwordError(value: string, minLength = 12): string | undefined {
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run tests/components/auth/formKit.test.ts
```
Expected: PASS, 8 tests.

- [ ] **Step 5: Confirm nothing else regressed**

```bash
npx vitest run
```
Expected: all pass (115 existing + 8 redirect + 8 formKit = 131).

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/formKit.ts tests/components/auth/formKit.test.ts
git commit -m "feat(auth): raise password minimum to 12 to match server policy"
```

---

## Task 6: Supabase client factories

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

**Interfaces:**
- Consumes: Task 1 deps, Task 2 env vars
- Produces: `createClient()` from `@/lib/supabase/client` (sync, browser) and `createClient()` from `@/lib/supabase/server` (async, server).

- [ ] **Step 1: Verify the installed `setAll` signature before writing code**

The `@supabase/ssr` cookie API has changed across versions — recent docs show `setAll(cookiesToSet, headers)` where the second argument carries cache headers (S8). Confirm what *your installed version* exposes:

```bash
grep -rn "setAll" node_modules/@supabase/ssr/dist/main/types.d.ts
```
Expected: a `setAll` signature. If it takes a second `headers` parameter, apply the `Cache-Control` / `Expires` / `Pragma` headers it provides (S8). If it takes only `cookiesToSet`, the version handles cache headers internally — use the one-argument form. **Match the installed types; do not copy a signature from memory.**

- [ ] **Step 2: Write the browser factory**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the publishable key (S2), which is safe to
 * ship to the browser — it carries the same low privileges as the old anon
 * key and RLS is the real boundary.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

- [ ] **Step 3: Write the server factory**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client for Server Components, Route Handlers and Server
 * Actions.
 *
 * Callers MUST use `getClaims()` (or `getUser()`) for authorization — never
 * `getSession()`, which reads cookie storage shared with the client and is
 * not revalidated (S1).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set headers. The
            // proxy refreshes the session on every request, so ignoring this
            // is safe (S8).
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Verify it typechecks**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/server.ts
git commit -m "feat(auth): add supabase browser and server client factories"
```

---

## Task 7: Session refresh and the `proxy.ts` guard (S1, S8, V4)

**Files:**
- Create: `src/lib/supabase/session.ts`, `src/proxy.ts`

**Interfaces:**
- Consumes: `safeNext` (Task 4), `@supabase/ssr`
- Produces: `updateSession(request: NextRequest): Promise<{ response: NextResponse; claims: unknown | null }>`; a root `proxy()` guarding all app routes.

**Read before starting:** Next.js 16 renamed `middleware.ts` → `proxy.ts` and `middleware()` → `proxy()`. **A leftover `middleware.ts` is ignored at build time with no error and no runtime warning** — the guard silently never runs. See https://nextjs.org/docs/messages/middleware-to-proxy

- [ ] **Step 1: Confirm no `middleware.ts` exists (V4)**

```bash
find . -name "middleware.ts" -not -path "./node_modules/*"
```
Expected: no output. If anything prints, delete it — it is dead code that will confuse the next reader and can mask a broken guard.

- [ ] **Step 2: Write the session refresher**

Create `src/lib/supabase/session.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookies for a request and returns the
 * verified JWT claims.
 *
 * Named `session.ts`, deliberately NOT `proxy.ts`: `src/proxy.ts` is a
 * Next.js file convention, and two same-named files at different layers
 * invites edits landing in the wrong one.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // S8. The library hands us the anti-caching headers it wants set
          // alongside auth cookies (Cache-Control / Expires / Pragma). Apply
          // them rather than hardcoding the values, so they cannot drift.
          //
          // THIS IS THE ONLY PLACE THEY CAN LAND: the server client
          // (src/lib/supabase/server.ts) writes through Next's cookies()
          // store, which has no API for setting response headers. Without
          // this loop, a CDN or reverse proxy can cache a response carrying
          // a session and serve one user's token to another.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // S1: getClaims() validates the JWT signature against the project's
  // published public keys on every call. Never getSession() here — it reads
  // client-shared cookie storage and is not revalidated.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
```

- [ ] **Step 3: Verify `getClaims()` exists and its return shape**

```bash
grep -rn "getClaims" node_modules/@supabase/supabase-js/dist/module/lib/*.d.ts node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts
```
Expected: a `getClaims` declaration. Confirm the result shape is `{ data: { claims }, error }`; adjust the destructuring in Step 2 if the installed version differs. If `getClaims` does **not** exist in the installed version, use `getUser()` instead (`const { data } = await supabase.auth.getUser()` → `data.user`) and note the change — `getUser()` is still safe (it revalidates against the Auth server), just slower. **Never substitute `getSession()`.**

- [ ] **Step 4: Write the guard**

Create `src/proxy.ts`.

> **The location is load-bearing, and "repo root" is WRONG for this project.** Next 16.2.10
> resolves the proxy file by scanning `path.join(pagesDir || appDir, '..')`. This project's
> `appDir` is `src/app`, so the scan directory is **`src/`** — a `proxy.ts` at the repo root is
> never seen (`node_modules/next/dist/build/index.js:616-622`; the `isAtConventionLevel` check at
> :629 accepts `/` only for projects without a `src/` directory). The dev bundler watches the same
> directory (`.../router-utils/setup-dev-bundler.js:199-203`).
>
> A misplaced proxy fails exactly like a leftover `middleware.ts`: no build error, no runtime
> warning, guard never runs, `/today` open to the world. Step 5 is what catches it.

```ts
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
  // very request that establishes it — AND the S8 cache headers, or a CDN
  // configured to cache redirects can store a response carrying a session.
  // Copy the three headers explicitly rather than the whole header set:
  // NextResponse.next() carries Next-internal x-middleware-* controls that are
  // not safe to graft onto a redirect.
  function redirectTo(pathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  if (!claims && !PUBLIC_PATHS.has(pathname)) {
    // Include the query string so a deep link survives the round trip; it is
    // still a same-origin relative path, so safeNext accepts it.
    const target = pathname + request.nextUrl.search;
    return redirectTo("/login", `?next=${encodeURIComponent(target)}`);
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
```

- [ ] **Step 5: Verify the guard actually runs (V4) — do not skip**

```bash
npm run dev
```
Then, in a browser with no session (or a private window):

1. Visit `http://localhost:3000/today` → expect a redirect to `/login?next=%2Ftoday`, with **no flash** of the app shell.
2. Visit `http://localhost:3000/` → expect the landing page, no redirect.

If `/today` renders, the guard is not running — almost certainly because the proxy file is in the
wrong place. Confirm it is at `src/proxy.ts` (this project has a `src/` directory, so the repo root
is never scanned) and that no `middleware.ts` exists. Both failures are silent.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/supabase/session.ts proxy.ts
git commit -m "feat(auth): add proxy route guard with supabase session refresh"
```

---

## Task 8: Auth route handlers

**Files:**
- Create: `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts`

**Interfaces:**
- Consumes: `createClient` (Task 6, server), `safeNext` (Task 4)
- Produces: `GET /auth/callback` (PKCE exchange), `GET /auth/confirm` (email verification).

- [ ] **Step 1: Write the OAuth callback**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

/** PKCE code exchange — where Google OAuth lands. */
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

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 2: Write the email confirmation handler**

Create `src/app/auth/confirm/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";

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

  // Recovery links must land on the password form, not the app.
  const destination = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth
git commit -m "feat(auth): add oauth callback and email confirm routes"
```

---

## Task 9: Turnstile widget (S11)

> **SHIPPED AND SUPERSEDED — the code block below is the original draft and contains two
> defects. `src/components/auth/Turnstile.tsx` in the repo is authoritative; read that, not this.**
>
> The draft (a) never called `window.turnstile.remove()` on unmount, stranding a widget in
> Cloudflare's registry on every client-side navigation between auth routes, and (b) had no
> `error` listener on the injected script, so a blocked `challenges.cloudflare.com` (ad blocker,
> corporate network) produced an empty div and a form that rejects every submit — a permanent,
> silent lockout indistinguishable from the no-site-key no-op.
>
> The shipped version adds an optional `onError?: () => void` (consumers MUST surface it) and
> keeps `onToken`/`onError` in refs with a `[]`-dependency lifecycle effect. That last part is
> load-bearing: with the callbacks in the dependency array, an inline arrow prop tore the widget
> down and rebuilt it on every parent render — measured at 4 renders / 3 removes across 3
> keystrokes — discarding the solved token and making submission impossible. `tests/components/
> auth/Turnstile.test.tsx` pins all of it.
>
> **Consumers must pass stable callbacks or accept that the refs absorb the churn — and must
> render `onError`'s message.** See Tasks 11-13.

**Files:**
- Create: `src/components/auth/Turnstile.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Produces: `<Turnstile ref={ref} onToken={(t: string | null) => void} />` and `TurnstileHandle { reset(): void }`.

**Why the handle:** Turnstile tokens are **single-use**. After any failed auth attempt the token is spent, and the next submit fails with a confusing CAPTCHA error unless the widget is reset. Every error path calls `reset()`.

- [ ] **Step 1: Write the component**

Create `src/components/auth/Turnstile.tsx`:

```tsx
"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileOptions) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileHandle {
  /** Turnstile tokens are single-use — reset after every failed submit. */
  reset: () => void;
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ onToken }, ref) {
    const holder = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          onToken(null);
        }
      },
    }));

    useEffect(() => {
      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!sitekey || !holder.current) return;

      function render() {
        if (!holder.current || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: sitekey!,
          theme: "auto",
          callback: (token) => onToken(token),
          "error-callback": () => onToken(null),
          "expired-callback": () => onToken(null),
        });
      }

      if (window.turnstile) {
        render();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", render);
        return () => existing.removeEventListener("load", render);
      }

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render);
      document.head.appendChild(script);

      return () => script.removeEventListener("load", render);
    }, [onToken]);

    return <div ref={holder} className="flex justify-center" />;
  },
);
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/Turnstile.tsx
git commit -m "feat(auth): add turnstile widget wrapper"
```

---

## Task 10: Real Google OAuth, drop Apple and GitHub

> **SPLIT — user decision 2026-07-17.** Google OAuth needs a Google Cloud OAuth client
> (client ID + secret in Supabase → Auth → Providers) that does not exist yet. Until it does, a
> "Continue with Google" button would dead-loop: `router.push("/today")` → the live proxy guard
> sees no session → 307 back to `/login`. Since Task 7 landed, **every control on the login page
> already behaves this way** — the stub UI is not merely dishonest, it is non-functional.
>
> This task is therefore split:
>
> - **Task 10a (do now, after Tasks 11–13):** remove the OAuth section entirely — Apple, GitHub
>   **and** Google — from `login/page.tsx` and `signup/page.tsx`, along with the `or` divider that
>   only exists to separate it from the email form. Delete `OAuthButtons.tsx`. Login and signup
>   become email/password only, and every control on screen works. Nothing lies.
> - **Task 10b (blocked on the user):** restore Google exactly as specified below, once the Google
>   Cloud client exists. Re-adds the component, the mount points, and the divider.
>
> **The note below that callers "need no change" is therefore FALSE for 10a**: removing the
> component means `login/page.tsx` and `signup/page.tsx` must both change. Apple and GitHub are
> gone permanently per spec:51; Google's removal is temporary and 10b is its restoration.
>
> Do 10a AFTER Tasks 11–13 — those make surgical edits to the same two pages, and removing the
> OAuth block first would only shift the lines under them.

**Files:**
- Modify: `src/components/auth/OAuthButtons.tsx` (full rewrite)

**Interfaces:**
- Consumes: `createClient` (Task 6, browser), `safeNext` (Task 4)
- Produces: `<OAuthButtons redirectTo={string} />` — same prop signature as today, so `login/page.tsx:66` and `signup/page.tsx:36` need no change.

The current file hardcodes `["Google", "Apple", "GitHub"]` and every button just calls `router.push(redirectTo)`. Apple needs a $99/yr developer account and GitHub adds setup for little reach — both are removed rather than left as stubs that lie.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/auth/OAuthButtons.tsx`:

```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FieldError } from "@/components/auth/FieldError";

/**
 * Google OAuth via PKCE. Apple and GitHub were removed with the auth stub:
 * Apple requires a paid developer account, and GitHub reaches few of Nitor's
 * users. Lands on /auth/callback, which exchanges the code for a session.
 */
export function OAuthButtons({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError("Could not reach Google. Try again.");
      setBusy(false);
    }
    // On success the browser navigates away; leave `busy` set.
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-micro)] [border-color:rgb(var(--hairline)/0.12)] [color:rgb(var(--text))] hover:[background:rgb(var(--surface-2))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] disabled:opacity-50 disabled:pointer-events-none"
      >
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      <FieldError message={error} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: exit 0. (`redirectTo` keeps its shape, so callers are unaffected.)

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/OAuthButtons.tsx
git commit -m "feat(auth): wire real google oauth, drop apple and github stubs"
```

---

## Task 11: Real signup

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: `createClient` (browser), `Turnstile` + `TurnstileHandle` (Task 9), `passwordError` (Task 5)
- Produces: real accounts; a "check your email" state.

- [ ] **Step 1: Replace the stubbed `handleSubmit` and add Turnstile**

In `src/app/(auth)/signup/page.tsx`, add imports:

```tsx
import { useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
```

Add state alongside the existing `useState` calls:

```tsx
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const [serverError, setServerError] = useState<string | undefined>();
const [sent, setSent] = useState(false);
const [busy, setBusy] = useState(false);
const turnstile = useRef<TurnstileHandle>(null);

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
```

Replace the whole stubbed `handleSubmit` (currently `router.push("/onboarding")`) with:

```tsx
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
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
    },
  });
  setBusy(false);

  // The token is spent whether or not the call succeeded (S11).
  turnstile.current?.reset();

  if (error) {
    setServerError(error.message);
    return;
  }
  setSent(true);
}
```

`router` is now unused — remove the `useRouter` import and the `const router = useRouter();` line.

- [ ] **Step 2: Add the confirmation-sent state**

Immediately before the existing `return (` of the form view:

```tsx
if (sent) {
  return (
    <AuthShell>
      <p className={eyebrow}>Almost there</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight [color:rgb(var(--text))]">
        Check your email
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed [color:rgb(var(--text-dim))]">
        We sent a confirmation link to{" "}
        <span className="[color:rgb(var(--text))]">{email}</span>. Open it to
        finish setting up your account.
      </p>
      <Link href="/login" className={`${accentLink} mt-6 inline-block`}>
        &larr; Back to sign in
      </Link>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Render Turnstile and the server error in the form**

Between the password field's closing `</div>` and the submit button:

```tsx
<Turnstile
  ref={turnstile}
  onToken={setCaptchaToken}
  onError={handleCaptchaUnavailable}
/>
<FieldError message={serverError} />
```

And make the button reflect progress — replace the submit button with:

```tsx
<button type="submit" className={primaryButton} disabled={busy}>
  {busy ? "Creating…" : "Create account"}
</button>
```

- [ ] **Step 4: Typecheck and lint**

```bash
npx tsc --noEmit && npx eslint "src/app/(auth)/signup/page.tsx"
```
Expected: both clean, no unused `useRouter`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/signup/page.tsx"
git commit -m "feat(auth): real signup with turnstile and email confirmation"
```

---

## Task 12: Real login (and remove the fake magic link)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `createClient` (browser), `Turnstile`, `safeNext` (Task 4)
- Produces: real sessions; honours `?next=`.

**Spec addendum — read this.** The current login page has a third auth method the spec never approved: an "Email me a magic link instead" button that sets `mode = "magic-sent"` and renders *"We sent a sign-in link to \<email\>"* — **while sending nothing**. The approved methods are email/password and Google only. Shipping a UI that claims to have sent an email it never sent is worse than having no feature, so the magic-link path is **removed**. (If you want magic links later, they are `signInWithOtp` and cost roughly one task on top of the SMTP already in Task 18.)

- [ ] **Step 1: Remove the magic-link path**

Delete, in `src/app/(auth)/login/page.tsx`:
- the `type Mode = "password" | "magic-sent";` declaration
- `const [mode, setMode] = useState<Mode>("password");`
- the whole `handleMagicLink` function
- the entire `if (mode === "magic-sent") { … }` block
- the "Email me a magic link instead" button

- [ ] **Step 2: Wire real sign-in**

Add imports:

```tsx
import { useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { safeNext } from "@/lib/auth/redirect";
```

Add state:

```tsx
const searchParams = useSearchParams();
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const [serverError, setServerError] = useState<string | undefined>();
const [busy, setBusy] = useState(false);
const turnstile = useRef<TurnstileHandle>(null);

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
```

Replace the stubbed `handleSubmit`:

```tsx
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
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  setBusy(false);
  turnstile.current?.reset(); // single-use token (S11)

  if (error) {
    // Deliberately generic: never reveal whether the address has an account.
    setServerError("That email or password is not right.");
    return;
  }

  // safeNext rejects attacker-supplied absolute/protocol-relative targets (S9).
  router.push(safeNext(searchParams.get("next")));
  router.refresh();
}
```

- [ ] **Step 3: Render Turnstile and the error**

Between the password field's closing `</div>` and the submit button:

```tsx
<Turnstile
  ref={turnstile}
  onToken={setCaptchaToken}
  onError={handleCaptchaUnavailable}
/>
<FieldError message={serverError} />
```

Replace the submit button:

```tsx
<button type="submit" className={primaryButton} disabled={busy}>
  {busy ? "Signing in…" : "Log in"}
</button>
```

- [ ] **Step 4: Wrap in Suspense**

`useSearchParams()` requires a Suspense boundary during static rendering or the build fails. Rename the component to `LoginForm` and add at the bottom of the file:

```tsx
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
```

Change the old `export default function LoginPage()` to `function LoginForm()` and import `Suspense` from `react`.

- [ ] **Step 5: Verify the build (this is what catches a missing Suspense boundary)**

```bash
npx tsc --noEmit && npm run build
```
Expected: both succeed. A `useSearchParams() should be wrapped in a suspense boundary` error means Step 4 was missed.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat(auth): real login with turnstile; remove fake magic-link flow"
```

---

## Task 13: Real password reset

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `createClient` (browser), `Turnstile`
- Produces: working reset emails and password updates.

- [ ] **Step 1: Wire forgot-password**

In `src/app/(auth)/forgot-password/page.tsx`, add imports:

```tsx
import { useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
```

Add state:

```tsx
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const [serverError, setServerError] = useState<string | undefined>();
const [busy, setBusy] = useState(false);
const turnstile = useRef<TurnstileHandle>(null);

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
```

Replace the stubbed `handleSubmit`:

```tsx
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
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
  });
  setBusy(false);
  turnstile.current?.reset(); // single-use token (S11)

  if (error) {
    setServerError("Could not send the link. Try again.");
    return;
  }
  // The existing copy already says "If that email exists…" — keep it. Never
  // reveal whether an address has an account.
  setSent(true);
}
```

Add before the submit button:

```tsx
<Turnstile
  ref={turnstile}
  onToken={setCaptchaToken}
  onError={handleCaptchaUnavailable}
/>
<FieldError message={serverError} />
```

- [ ] **Step 2: Wire reset-password**

Read `src/app/(auth)/reset-password/page.tsx` first — it already validates with `passwordError` (now min 12 via Task 5). Replace its stubbed submit with:

```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitted(true);
  setServerError(undefined);
  if (passwordError(password)) return;

  setBusy(true);
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  setBusy(false);

  if (error) {
    setServerError(error.message);
    return;
  }
  router.push("/today");
}
```

Add the matching `serverError` / `busy` state and a `<FieldError message={serverError} />` above the submit button. No Turnstile here: the user arrives with a valid recovery session, and `updateUser` is not a CAPTCHA-protected endpoint.

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit && npx eslint "src/app/(auth)"
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/forgot-password/page.tsx" "src/app/(auth)/reset-password/page.tsx"
git commit -m "feat(auth): real password reset flow"
```

---

## Task 14: Session context and sign-out

**Files:**
- Create: `src/state/SessionProvider.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `createClient` (browser)
- Produces: `useSession(): { user: User | null; profile: Profile | null; loading: boolean; signOut: () => Promise<void> }`, and `interface Profile { id: string; display_name: string | null; onboarding_completed: boolean }`.

**Why client-side:** the app is entirely `"use client"` (see `AppFrame`, `Sidebar`). This context is for **display only** — `proxy.ts` is the authorization boundary (S1). Nothing here is a security control.

- [ ] **Step 1: Write the provider**

Create `src/state/SessionProvider.tsx`:

```tsx
"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
}

interface SessionValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string) => {
    const supabase = createClient();
    // RLS restricts this to the caller's own row — no user filter needed,
    // but .eq() keeps the intent obvious to the next reader.
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, onboarding_completed")
      .eq("id", id)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // getUser() revalidates against the Auth server; never getSession() (S1).
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      if (data.user) await loadProfile(data.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      if (next) void loadProfile(next.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }, []);

  return (
    <Ctx.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
```

- [ ] **Step 2: Mount it in the layout**

In `src/app/layout.tsx`, add the import:

```tsx
import { SessionProvider } from "@/state/SessionProvider";
```

Wrap `RepositoryProvider` — session is the outer concern:

```tsx
<ThemeProvider>
  <SessionProvider>
    <RepositoryProvider>
      <GlassFilterDefs />
      <Loader />
      {children}
    </RepositoryProvider>
  </SessionProvider>
</ThemeProvider>
```

- [ ] **Step 3: Typecheck and build**

```bash
npx tsc --noEmit && npm run build
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/state/SessionProvider.tsx src/app/layout.tsx
git commit -m "feat(auth): add session context and sign-out"
```

---

## Task 15: Real user in the sidebar

**Files:**
- Modify: `src/components/nav/Sidebar.tsx:47-55`

**Interfaces:**
- Consumes: `useSession` (Task 14)
- Produces: nothing downstream.

The footer currently hardcodes a `"Y"` avatar and the label `"You"`.

- [ ] **Step 1: Replace the hardcoded footer**

Add the import:

```tsx
import { useSession } from "@/state/SessionProvider";
```

Inside `Sidebar()`, above the `return`:

```tsx
const { user, profile, signOut } = useSession();
const label = profile?.display_name || user?.email || "You";
const initial = label.charAt(0).toUpperCase();
```

Replace the `mt-auto` footer block (currently the `"Y"` span + `"You"` span) with:

```tsx
<div className="mt-auto border-t px-6 py-5 [border-color:rgb(var(--hairline)/0.08)]">
  <div className="flex items-center gap-3">
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium [background:rgb(var(--surface-2))] [color:rgb(var(--text-dim))]"
      aria-hidden="true"
    >
      {initial}
    </span>
    <span className="truncate text-sm [color:rgb(var(--text-dim))]" title={label}>
      {label}
    </span>
  </div>
  <button
    type="button"
    onClick={() => void signOut()}
    className="mt-3 text-xs [color:rgb(var(--text-mute))] transition-colors duration-[var(--dur-micro)] [transition-timing-function:var(--ease)] hover:[color:rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))] rounded-sm"
  >
    Sign out
  </button>
</div>
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
npx vitest run
```
Expected: all pass. If a test renders `Sidebar` outside `SessionProvider`, `useSession` throws — wrap the render in `<SessionProvider>` in that test rather than weakening the hook's guard.

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/Sidebar.tsx
git commit -m "feat(auth): show real user and sign-out in sidebar"
```

---

## Task 16: Onboarding gating

**Files:**
- Modify: `src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: `useSession` (Task 14), `createClient` (browser)
- Produces: `profiles.onboarding_completed = true` on completion.

Habit picking still writes to the in-memory `MockHabitRepository` — unchanged this slice (that is slice 2).

- [ ] **Step 1: Read the file and find where onboarding finishes**

```bash
grep -n "router.push\|onComplete\|Finish\|Done" src/app/onboarding/page.tsx
```
The final step routes into the app. That is the hook point.

- [ ] **Step 2: Mark the profile complete before routing**

Add imports:

```tsx
import { useSession } from "@/state/SessionProvider";
import { createClient } from "@/lib/supabase/client";
```

In the component:

```tsx
const { user } = useSession();
```

At the completion handler, before the existing `router.push("/today")`:

```tsx
if (user) {
  const supabase = createClient();
  // RLS allows updating only your own row (profiles_update_own).
  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
}
```

Make the handler `async` if it is not already.

- [ ] **Step 3: Redirect users who have already onboarded**

Near the top of the component:

```tsx
const { profile } = useSession();
const router = useRouter();

useEffect(() => {
  if (profile?.onboarding_completed) router.replace("/today");
}, [profile, router]);
```

(Deliberately client-side: gating this in `proxy.ts` would cost a database query on every request to buy very little.)

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npx eslint src/app/onboarding/page.tsx
git add src/app/onboarding/page.tsx
git commit -m "feat(auth): persist onboarding completion to profile"
```

---

## Task 17: Migrate quotes to the publishable key (S3, V8)

**Files:**
- Modify: `src/data/quotes/remote.ts:41-42,62-64`
- Modify: `scripts/seed-quotes.ts` (if it reads `SUPABASE_SERVICE_ROLE_KEY`)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Produces: a working remote quote top-up.

**STATUS: DONE — commit 7f8e7f4. This section's original diagnosis was WRONG; corrected below.**

**This is a real break, not a cleanup.** But the break is `remote.ts:42` reading `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which no longer exists. The key is `undefined`, so `loadRemoteQuotes` returns early at the not-provisioned guard on line 52 and **never fetches at all**. The path fails closed to the bundled 58 quotes, so a broken version looks completely healthy — hence V8.

~~Publishable keys **cannot** be sent as `Authorization: Bearer` (S3).~~ **This claim is false.** Verified against the live API (2026-07-16):

| Request | Result |
| --- | --- |
| `apikey` only | **200** |
| `apikey` + `Authorization: Bearer <publishable>` | **200** — so Bearer is *not* the break |
| `apikey` + `Authorization: Bearer <garbage>` | 401 `Expected 3 parts in JWT` |
| `Authorization: Bearer <publishable>`, no `apikey` | 401 `No API key found` |
| bogus `apikey` | 401 `Invalid API key` |

The garbage-Bearer 401 is the control that makes this conclusive: `Authorization` genuinely is parsed, so the 200 on row 2 is a real acceptance and not the header being ignored. The env var name was the *only* defect, and the fetch never reached the header.

Dropping `Authorization` is still correct — a publishable key there pins the request to `anon` even for a signed-in caller — but it is a **cleanup**, not the fix. Do not repeat the S3 claim as stated; the real S3 rule is narrower than "publishable keys are rejected as Bearer".

- [ ] **Step 1: Update the env var and headers**

In `src/data/quotes/remote.ts`, replace:

```ts
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```
with:
```ts
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
```

and replace:

```ts
      headers: { apikey: key, Authorization: `Bearer ${key}` },
```
with:
```ts
      // `apikey` only. Authorization is where a signed-in user's JWT belongs;
      // a publishable key there pins the request to `anon`. (It is accepted as
      // Bearer — this is a cleanup, not the fix. See the table above.)
      headers: { apikey: key },
```

- [ ] **Step 2: Check the seed script for a legacy key**

```bash
grep -n "SERVICE_ROLE\|ANON_KEY\|Authorization" scripts/seed-quotes.ts
```
If it reads `SUPABASE_SERVICE_ROLE_KEY`, switch it to `SUPABASE_SECRET_KEY` (S2). If it sends `Authorization: Bearer` with a secret key, that is still valid for secret keys — but prefer the `apikey` header for consistency.

- [ ] **Step 3: Verify existing quote tests still pass**

```bash
npx vitest run tests/data/quotesRemote.test.ts
```
Expected: PASS. If a test asserts the `Authorization` header, update it to assert `apikey` only — the test was encoding the old contract.

- [ ] **Step 4: Prove the top-up actually works (V8) — it fails silently otherwise**

With `.env.local` populated and quotes seeded (Task 3), run:

```bash
npm run dev
```

In the browser console on any app page:

```js
localStorage.removeItem("nitor.quotes.cache");
localStorage.removeItem("nitor.quotes.fetchedAt");
location.reload();
```

Then, in the Network tab, find the request to `…/rest/v1/quotes?select=…`.
Expected: **HTTP 200** with a JSON array of quotes. A **401** means the header change is wrong. Confirm afterwards:

```js
JSON.parse(localStorage.getItem("nitor.quotes.cache")).length;
```
Expected: a number > 0.

- [ ] **Step 5: Commit**

```bash
git add src/data/quotes/remote.ts scripts/seed-quotes.ts
git commit -m "fix(quotes): use publishable key via apikey header only"
```

---

## Task 18: Dashboard configuration (partly BLOCKED on the domain)

**Files:** none (Supabase dashboard)

**Interfaces:**
- Consumes: Task 2's project, Tasks 8's route paths
- Produces: working email delivery, Google provider, CAPTCHA, password policy.

- [ ] **Step 1: Set the password policy (S10)**

Auth → Providers → Email:
- Minimum password length: **12** (must match Task 5's `passwordError`)
- **Enable** "Prevent use of leaked passwords" (checks HaveIBeenPwned)
- Confirm email: **on**

- [ ] **Step 2: Configure Turnstile (S11)**

1. Cloudflare dashboard → Turnstile → create a widget. For local dev add `localhost` to the allowed hostnames.
2. Put the **site** key in `.env.local` as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. Supabase → Auth → Bot and Abuse Protection → enable CAPTCHA, provider **Turnstile**, paste the **secret** key.

> Enabling this turns CAPTCHA on for **every** auth endpoint — login and password-reset included, not just signup. Tasks 11–13 already pass `captchaToken` on all three. If any form was missed, it breaks the moment this is switched on.

- [ ] **Step 3: Configure Google OAuth**

1. Google Cloud console → new project → OAuth consent screen → Credentials → OAuth client ID (Web).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Auth → Providers → Google → enable, paste client ID + secret.
4. Supabase → Auth → URL Configuration → add `http://localhost:3000/auth/callback` to the redirect allowlist for dev.

- [ ] **Step 4: Point the email templates at `/auth/confirm`**

Auth → Email Templates → "Confirm signup" — the link must target the Task 8 handler:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding">Confirm your email</a>
```

"Reset password" template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

- [ ] **Step 5: Custom SMTP — BLOCKED until the domain is registered**

Do **not** attempt this before the app domain exists.

When it does:
1. Register the domain; create a Resend (or equivalent) account.
2. Add the DKIM/SPF/DMARC DNS records it gives you; wait for verification.
3. Supabase → Project Settings → Auth → SMTP Settings → enable custom SMTP with those credentials; set the sender to an address on the verified domain.
4. Auth → URL Configuration → set Site URL to the production domain and add `https://<domain>/auth/callback` to the allowlist.
5. Google Cloud → add the production redirect URI.
6. Cloudflare Turnstile → add the production hostname.

Until this is done, the project's built-in SMTP sends a few emails/hour — enough to test with your own address, not enough to ship. **This step gates any public deploy.**

- [ ] **Step 6: Re-run the security advisor (V1)**

Advisors → Security. Expected: zero findings.

---

## Task 19: Final verification sweep

**Files:** none (verification only)

Every gate below produces observable output. Record the actual result — "looks right" is not a result.

- [ ] **Step 1: V9 — the full local suite**

```bash
npx tsc --noEmit && npx vitest run && npm run build
npx eslint $(git diff --name-only 3db39d8 HEAD -- '*.ts' '*.tsx')
```
Expected: all clean; every test passes (137 as of the Turnstile fixes — later tasks add more;
record the actual count, not "looks right").

The lint gate is **consciously scoped to files this branch touched**, not `npx eslint .`.
Measured 2026-07-16: `npx eslint .` fails with **25 pre-existing errors at pristine HEAD
(3db39d8)** — eslint-plugin-react-hooks 7.x rules firing on Phase 1 code (ScrollStory alone
has 13). Zero of them are in Phase 2 files. Do not "fix" them here: react-hooks findings in
UI code need individual judgment and belong to a dedicated lint-debt task on its own branch.
Until that task lands, `npx eslint .` failing with exactly those 25 is the expected baseline;
a 26th error means this branch introduced one.

- [ ] **Step 2: V4 — the guard exists AND is actually wired in**

```bash
find . -name "middleware.ts" -not -path "./node_modules/*"
git ls-files "*proxy.ts"
npm run build 2>&1 | grep "Proxy"
```
Expected: nothing for the first; exactly `src/proxy.ts` for the second; **`ƒ Proxy (Middleware)`
for the third**.

The build check is the one that matters. Next lists Proxy in its route table only when it
*detects* the file — and a proxy in the wrong place produces no error, no warning, and a
successful build. Empirically confirmed on this repo: moving the file to the repo root makes this
line vanish while `npm run build` still reports success. A passing tsc/lint/test suite tells you
nothing about whether the guard is loaded.

Then, logged out, visit `/today` → redirected to `/login?next=%2Ftoday` with no shell flash.

- [ ] **Step 3: V3 — no secrets in the repo**

```bash
git grep -n "sb_secret_" -- . ':!*.md' || echo "clean"
git check-ignore -v .env.local
git status --short
```
Expected: `clean`; `.env.local` ignored; not present in status.

- [ ] **Step 4: V1 — advisors**

Supabase → Advisors → Security. Expected: **zero** security findings.

- [ ] **Step 5: V2 — negative RLS test**

Re-run Task 3 Step 5 with real signed-up users. Expected: user B selecting user A's profile row → **0 rows**.

- [ ] **Step 6: V5, V6 — the unit gates**

```bash
npx vitest run tests/lib/redirect.test.ts tests/components/auth/formKit.test.ts
```
Expected: 16 pass. Then in the UI: type a 10-character password on `/signup` → **Nitor's own** "Use at least 12 characters." appears, and the network tab shows **no** request to Supabase.

- [ ] **Step 7: V8 — quote top-up**

Re-run Task 17 Step 4. Expected: HTTP **200** on `/rest/v1/quotes`.

- [ ] **Step 8: V7 — end-to-end in a real browser**

Run each and record the outcome:

1. **Signup** → confirmation email arrives → click link → lands on `/onboarding` with a session.
2. **Profile row** exists: SQL Editor → `select * from public.profiles;` → your row, `onboarding_completed = false`.
3. **Complete onboarding** → lands on `/today` → re-check SQL → `onboarding_completed = true`.
4. **Revisit `/onboarding`** → immediately redirected to `/today`.
5. **Sign out** → lands on `/login`; visiting `/today` redirects back to login.
6. **Log in** → lands on `/today`.
7. **Deep link**: logged out, visit `/settings` → `/login?next=%2Fsettings` → log in → land on `/settings`.
8. **Open redirect (S9)**: visit `/login?next=https://example.com` → log in → land on `/today`, **never** example.com.
9. **Logged-in `/login`** → redirected to `/today`.
10. **Google OAuth** → completes → lands in the app with a session.
11. **Password reset** → email arrives → link → set a new password → logged in.

- [ ] **Step 9: Confirm the ship gate is respected**

Slice 1 does **not** deploy on its own. Confirm:
- `BETA_SIGNUP_NOTICE` in `src/content/beta.ts` still carries its "do not ship until Phase 2 lands persistence" comment.
- Habits are still the in-memory mock (expected this slice) — so no public deploy.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "chore: phase 2 slice 1 verification sweep"
```

---

## Self-review notes

**Spec coverage:** S1 → Tasks 7, 14. S2 → Tasks 2, 17. S3 → Task 17. S4 → Tasks 1, 2, 19. S5 → Task 3. S6 → Task 3. S7 → Task 3. S8 → Tasks 6, 7. S9 → Tasks 4, 8, 12. S10 → Tasks 5, 18. S11 → Tasks 9, 11, 12, 13, 18. S12 → Tasks 3, 18, 19. V1–V9 → Task 19. Route map → Tasks 7, 8. UI table → Tasks 10–17. Provisioning order → Tasks 1–3, 18.

**Gaps found and closed during planning:**
1. **Magic link** — the login page ships a stubbed "we sent a link" flow that sends nothing. Not in the spec's approved methods; removed in Task 12 and flagged as a spec addendum.
2. **`.env.example` was unreachable** — the existing `.gitignore` rule `.env*` also ignores the example file. Task 1 adds `!.env.example`.
3. **`docs/*` is gitignored** (with only `!docs/features/` excepted), so this plan and its spec are **not tracked by git**. Decide explicitly: either add `!docs/superpowers/` to `.gitignore`, or accept that they live only on this machine.

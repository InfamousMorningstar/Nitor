# Phase 2, Slice 1 — Identity & Session

_Design spec. Written 2026-07-16._

## Context

Nitor's prototype is feature-complete on the front end (~90%) and runs entirely on stubs:

- **Auth is fake.** Any email + password enters the app. `OAuthButtons` calls `router.push()`.
- **Data is fake and ephemeral.** `MockHabitRepository` is constructed from `buildSeed()` on
  every mount and holds everything in memory. Nothing is persisted — not even to localStorage.
  A page reload restores the seed.
- **Supabase is not provisioned.** No project exists. No Supabase SDK is installed; the only
  integration is a raw `fetch` in `src/data/quotes/remote.ts` that no-ops without env vars.

Phase 2 decomposes into five slices. **This spec covers slice 1 only.**

| # | Slice | Depends on | Status |
|---|-------|-----------|--------|
| 1 | **Identity & session** | — | **this spec** |
| 2 | Persistence & RLS (schema, `user_id`, `SupabaseHabitRepository`) | 1 | not yet specced |
| 3 | Settings & pet sync (zustand/localStorage → Postgres) | 2 | optional |
| 4 | Notifications delivery (push, email, quiet hours, digest) | 1 | not yet specced |
| 5 | Import-merge (JSON import + merge semantics) | 2 | not yet specced |

Slice 1 comes first because RLS policies are built on `auth.uid()` — no identity, no policies.

### Scope

**In scope:** provisioning the Supabase project; `@supabase/ssr`; cookie-based sessions; a
`proxy.ts` route guard; real email/password and Google OAuth; email confirmation and password
reset via custom SMTP; Turnstile bot protection; a `profiles` table with RLS and a signup
trigger; onboarding gating; sign-out; migrating the existing quotes integration to the new API
keys.

**Out of scope:** habit/log persistence (slice 2 — `MockHabitRepository` stays wired up and
in-memory throughout this slice); settings/pet sync; notifications; import-merge; any Phase 1
polish (HabitForm edit mode, favicon, a11y audit, 3D pet asset) — Phase 1 stays at ~90%.

### Ship gate

**Slice 1 must not be deployed publicly on its own.** With auth real but data still an in-memory
shared seed, every account would see identical fake habits that vanish on reload. Also,
`BETA_SIGNUP_NOTICE` in `src/content/beta.ts` promises "your data is safe" — that claim is only
true once slice 2 lands. Slice 1 merges to `main` and waits.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sign-in methods | Email + password, Google OAuth | Apple needs a $99/yr developer account; GitHub adds setup for little reach in a non-technical beta. Both buttons are removed rather than left as dead stubs. |
| Email confirmation | On, via custom SMTP | Supabase's built-in SMTP is dev-only and rate-limited to a few emails/hour; it cannot carry a public beta. Password reset needs real delivery regardless. |
| Domain | New dedicated domain, TBD at deploy | Not yet registered. Treated as a parameter throughout — see "Deployment parameters". |
| Profile storage | `public.profiles` table | `user_metadata` is client-writable by the authenticated user and must never back a trust decision or an RLS policy. |
| Bot protection | Cloudflare Turnstile | Free, unlimited, natively supported by Supabase Auth, and mostly invisible. Protects the email quota and the new domain's sending reputation. |
| Session transport | `@supabase/ssr`, HTTP-only cookies | Keeps RLS as the real enforcement boundary and lets slice 2 move queries server-side without a rewrite. localStorage tokens are XSS-readable; a service-role API layer would bypass RLS entirely. |

## Architecture

### Session flow

```
Browser ──request──> proxy.ts ──refresh session (cookies)──> Supabase Auth
                        │
                        ├─ getClaims() → valid?  ── no ──> redirect /login?next=<path>
                        │                          yes
                        └─────────> Server Component / page renders
```

Three client factories from `@supabase/ssr`, each thin and single-purpose:

| File | Factory | Used by |
|---|---|---|
| `src/lib/supabase/client.ts` | `createBrowserClient` | Client Components (auth forms) |
| `src/lib/supabase/server.ts` | `createServerClient` | Server Components, Route Handlers, Server Actions |
| `src/lib/supabase/session.ts` | `createServerClient` | `proxy.ts` session refresh |

(The session-refresh factory is deliberately **not** named `proxy.ts` — `src/proxy.ts` is a
Next.js file convention, and two files of the same name at different layers invites edits landing
in the wrong one.)

### The `proxy.ts` convention

Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported `middleware()` → `proxy()`.
The `matcher` config is unchanged.

> **A leftover `middleware.ts` is ignored at build time with no error and no runtime warning.**

For an auth guard this is a silent, total failure: the file looks right, the build passes, and
nothing runs. The repo must contain the proxy and **must not** contain `middleware.ts`.

**The file lives at `src/proxy.ts`, not the repo root.** Next resolves it by scanning
`path.join(pagesDir || appDir, '..')`; this project's `appDir` is `src/app`, so the scan directory
is `src/`, and a repo-root `proxy.ts` is never seen
(`node_modules/next/dist/build/index.js:616-622` — `isAtConventionLevel` accepts `/` only for
projects without a `src/` directory). Verified against installed Next 16.2.10.

Wrong location fails exactly like the wrong filename: silently, completely, with the app serving
protected pages to logged-out users. Both are covered by V4, and only a live request proves it.

### Route map

| Route | Access | Notes |
|---|---|---|
| `/` | public | landing |
| `/login`, `/signup` | public | authenticated users → redirect `/today` |
| `/forgot-password`, `/reset-password` | public | |
| `/auth/callback` | public | **new** — PKCE `exchangeCodeForSession` for Google OAuth |
| `/auth/confirm` | public | **new** — `verifyOtp` for email confirmation links |
| `/today`, `/habits`, `/stats`, `/insights`, `/pet`, `/settings` | authenticated | |
| `/onboarding` | authenticated | + `profiles.onboarding_completed = false`, else → `/today` |

The proxy `matcher` excludes `_next/static`, `_next/image`, favicon, and image assets.

## Data model

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

Notes, each load-bearing:

- **No insert or delete policy.** Insert is owned by the signup trigger below; delete cascades
  from `auth.users`. Deny-by-default means absent policies are already closed.
- **`drop policy if exists` before each `create policy`.** `create policy` has no `if not
  exists` form, so without this the file aborts on a re-run (42710) while the rest of it is
  idempotent — meaning an edited function body would silently never be applied. The file is
  applied by hand, so re-runs are likely.
- **`to authenticated`** keeps the policy from being evaluated for anonymous requests at all.
- **`(select auth.uid())`** rather than bare `auth.uid()` — the subselect is evaluated once per
  statement as an initPlan instead of once per row. This is the documented RLS performance
  pattern and matters before the table is large, not after.

### Signup trigger

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- **`set search_path = ''` is mandatory.** A `security definer` function with a mutable search
  path lets a caller shadow an unqualified name and execute code as the function owner. All
  references inside must therefore be fully qualified (`public.profiles`, not `profiles`).
  Supabase's security advisor flags this as "Function Search Path Mutable" — it is a
  V1 blocker, not a style note.
- `display_name` is read from `raw_user_meta_data`, which is **user-controlled input**. It is
  safe as a display string (React escapes it on render) but must never inform an authorization
  decision, and is length-capped on write.

## Security requirements

Numbered so the implementation plan can reference them individually. Each is verifiable.

**S1 — Never trust `getSession()` in server code.** All server-side authorization uses
`getClaims()`, which validates the JWT signature against the project's published public keys on
every call. Supabase's guidance is explicit: *"Never trust `supabase.auth.getSession()` inside
server code such as Proxy. It isn't guaranteed to revalidate the Auth token."* `getSession()`
reads cookie storage shared with the client and its embedded user object is not trustworthy.
`getUser()` is acceptable where fresh user data is needed but costs a network call per
invocation; `getClaims()` is the default for route protection.

**S2 — New API keys, not legacy.** Use publishable (`sb_publishable_…`) and secret
(`sb_secret_…`) keys. Publishable carries the same low privileges as `anon`. Secret returns HTTP
401 if used from a browser and rotates per-service — protections `service_role` lacks. Legacy
`anon`/`service_role` keys are not used by new code.

**S3 — Publishable keys go in the `apikey` header only.** They cannot be sent as
`Authorization: Bearer`. **This breaks existing code:** `src/data/quotes/remote.ts:63` currently
sends both `apikey` and `Authorization: Bearer <anon key>`. Migrating keys without fixing that
line silently breaks the quote top-up (it fails closed to the bundled pool, so it will not be
noticed). One-line fix, must be in the plan.

**S4 — The secret key never enters the repo.** `.env.local` is confirmed gitignored *before*
any key is written to it. The secret key lives only in `.env.local` and the deploy environment.
It is never referenced from a `NEXT_PUBLIC_*` variable.

**S5 — `user_metadata` never backs an RLS policy or a trust decision.** It is writable by the
authenticated user from the client. `onboarding_completed` lives in `profiles` for exactly this
reason.

**S6 — RLS enabled on every table in the `public` schema**, deny-by-default. This includes the
existing `public.quotes` table (already compliant: RLS on, select-only policy).

**S7 — `security definer` functions pin `search_path = ''`** and fully qualify every reference.

**S8 — Cache headers on session responses.** The `setAll` cookie handler applies
`Cache-Control`, `Expires`, and `Pragma` so no CDN or shared cache can ever store a response
carrying a session. In Server Components — which cannot set headers — `setAll` is wrapped in
try/catch, since the proxy is what writes cookies and headers on every request.

_Verified against installed `@supabase/ssr` 0.12.3:_ `SetAllCookies` is
`(cookies, headers: Record<string, string>) => Promise<void> | void`. The library supplies the
exact anti-caching headers; apply what it passes rather than hardcoding the values. The library's
own note on why: *"Responses that set auth cookies must not be cached by CDNs or reverse proxies,
otherwise one user's session token can be served to a different user."*

**The proxy is the only place these headers can land.** The server client writes through Next's
`cookies()` store, which has no API for setting response headers — so it takes the one-argument
`setAll` form and delegates. If the proxy omits the header loop, S8 is satisfied nowhere.

**S9 — Open-redirect protection on `?next=`.** Accept only same-origin relative paths: must
match `/^\/(?!\/)/` (single leading slash, no protocol-relative `//evil.com`, no absolute URL).
Anything else falls back to `/today`. Unit-tested (V5).

**S10 — Password policy parity.** Supabase minimum length is set to 12 **and**
`passwordError()` in `src/components/auth/formKit.ts` is updated to match. It currently defaults
to `minLength = 8`; a mismatch means a 10-character password passes client validation and is
rejected by the API with a raw error. The default change covers both callers (`signup` and
`reset-password`), which both call `passwordError(password)` without an explicit minimum.
`passwordError` has **no test coverage today** — the change ships with one (V6). Leaked-password
protection (HaveIBeenPwned) is enabled.

**S11 — Turnstile on every auth form.** Enabling CAPTCHA in Supabase applies it to **all** auth
endpoints, not just signup. `signInWithPassword` and `resetPasswordForEmail` will fail without a
token. The widget therefore goes on login, signup, **and** forgot-password, with the token passed
as `options.captchaToken`. The Turnstile *secret* is configured in the Supabase dashboard, not in
the app.

**S12 — `get_advisors` returns zero security findings** before merge (V1).

## UI changes

| File | Change |
|---|---|
| `src/components/auth/OAuthButtons.tsx` | Drop Apple and GitHub. Google becomes a real `signInWithOAuth` (PKCE) call with `redirectTo` → `/auth/callback`. |
| `src/app/(auth)/signup/page.tsx` | Real `signUp`; Turnstile; server error surfacing; confirmation-sent state. |
| `src/app/(auth)/login/page.tsx` | Real `signInWithPassword`; Turnstile; error surfacing. |
| `src/app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx` | Real `resetPasswordForEmail` / `updateUser`; Turnstile on forgot-password. |
| `src/components/auth/formKit.ts` | `passwordError` minimum 8 → 12 (S10). |
| `src/app/onboarding/page.tsx` | On completion set `profiles.onboarding_completed = true`. Habit picking still writes to the in-memory mock — unchanged this slice. |
| `src/components/nav/Sidebar.tsx` | Replace hardcoded `"You"` and `"Y"` avatar with real `display_name`/email + initial; add sign-out. |
| `src/data/quotes/remote.ts` | Drop the `Authorization: Bearer` header; publishable key via `apikey` only (S3). |

`BetaChip` and the beta copy in `src/content/beta.ts` are untouched.

## Deployment parameters

Not yet known; the implementation treats each as a variable rather than hardcoding:

- **App domain** — not registered. Sets OAuth redirect URLs, Supabase Site URL, and the SMTP
  sender domain.
- **Supabase project ref / region.**
- **SMTP provider credentials** (Resend or equivalent), configured in the Supabase dashboard
  after DNS verification on the app domain.

### Environment variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | replaces `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | **server only** | seeding/admin. Never `NEXT_PUBLIC_*` (S4). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | |

The Turnstile secret and SMTP credentials are dashboard configuration, not app env vars.

## Provisioning order

1. Verify `.env.local` is gitignored (S4) — **before** any key is written.
2. Create the Supabase project. Enable JWT signing keys (asymmetric) and create
   publishable/secret keys.
3. Apply `supabase/profiles.sql` (table, RLS, policies, trigger).
4. Apply the already-written `supabase/quotes.sql`; seed via `scripts/seed-quotes.ts`. This has
   been queued since Phase 1 and is unblocked by the project existing.
5. Configure Auth: Site URL + redirect allowlist, Google provider, custom SMTP, password
   minimum 12, leaked-password protection, Turnstile.
6. Run `get_advisors` (V1).

## Verification gates

Evidence required before merge — each produces observable output, not an assertion.

- **V1** — `get_advisors` (security): zero findings. Re-run after every migration.
- **V2** — **Negative RLS test:** with two real users, user B selects user A's profile row via
  the publishable key and receives **0 rows** (not an error — RLS filters silently, which is why
  this must be tested rather than assumed).
- **V3** — Secret key absent from the repo: `git grep` for `sb_secret_` and the literal key
  returns nothing; `.env.local` confirmed ignored.
- **V4** — No `middleware.ts` anywhere in the repo; `proxy.ts` exists and its guard demonstrably
  runs (logged-out request to `/today` redirects before any app shell renders).
- **V5** — Unit tests: `?next=` validator rejects `//evil.com`, `https://evil.com`,
  `/\evil.com`, and accepts `/today`, `/habits`.
- **V6** — Password parity: a new unit test covers `passwordError` (currently untested), and a
  10-character password is rejected **client-side** with Nitor's own message, never reaching the
  API (S10).
- **V7** — End-to-end, driven in a real browser: signup → confirmation email received → link →
  session → onboarding → `/today`; sign-out clears the session; logged-out `/today` redirects to
  `/login?next=/today` and returns there after login; logged-in `/login` redirects to `/today`;
  Google OAuth completes the same round trip.
- **V8** — Quote top-up still works against the migrated key (S3) — verify a remote quote is
  actually fetched, since this path fails closed and looks fine when broken.
- **V9** — `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (115 tests, none should regress),
  `npm run build`.

## Risks

- **Silent-failure cluster.** V4 (ignored `middleware.ts`), V2 (RLS filters to 0 rows rather
  than erroring), and V8 (quotes fail closed to the bundled pool) all look like success when
  broken. Each needs positive evidence.
- **Email deliverability** on a brand-new domain. Warm-up matters; expect confirmations to land
  in spam before DNS reputation establishes.
- **Interim state.** Between slices 1 and 2, `main` holds real auth over fake shared data. This
  is why the ship gate exists.

## Sources

- [Supabase — Next.js server-side auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js — Renaming Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Supabase — Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Supabase — JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — RLS performance and best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

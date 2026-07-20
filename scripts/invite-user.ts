// scripts/invite-user.ts
// Creates a pre-confirmed auth user with a generated password, for beta access
// while transactional email cannot reach non-org addresses.
// Run: npx tsx --env-file=.env.local scripts/invite-user.ts <email>
//
// Why pre-confirmed: the project still uses Supabase's built-in SMTP, which only
// delivers to members of the Supabase organization. A normal signup by an outside
// address therefore never receives its confirmation link and the account is
// unusable. `email_confirm: true` marks the address confirmed at creation, which
// is the only reason this script exists — delete it once custom SMTP is live.
//
// Design note — this script asserts success from positive evidence:
// the admin API returns a body on success, but a created user is not proof the
// account WORKS. So after creating it we (a) re-read the user by id, (b) confirm
// the on_auth_user_created trigger produced the profile row the app's onboarding
// gate reads, and (c) actually sign in with the generated password over the same
// public endpoint the real login form uses. Anything less would report success
// for an account that cannot log in.

import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY",
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/invite-user.ts <email>");
  process.exit(1);
}

// Re-bound as plain strings: the guard above narrows these at module scope, but
// the narrowing does not survive into the async function below.
const PUBLISHABLE: string = publishable;

const BASE = url.replace(/\/$/, "");
const adminHeaders = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

/**
 * Rejection-sampled so every character is equally likely — a plain modulo over
 * a 62-character alphabet biases toward the first few letters and quietly costs
 * entropy. 20 chars from 62 is ~119 bits, well past anything brute-forceable.
 */
function generatePassword(length = 20): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const max = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte >= max) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

async function main() {
  const password = generatePassword();

  // 1. Create, pre-confirmed.
  const createRes = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    console.error(`FAILED to create user (${createRes.status}):`, created);
    process.exit(1);
  }
  const id: string | undefined = created?.id;
  if (!id) {
    console.error("FAILED: create returned no user id:", created);
    process.exit(1);
  }
  console.log(`  ok  user created           ${email}`);

  // 2. Re-read it. A create that cannot be read back is not a create.
  const readRes = await fetch(`${BASE}/auth/v1/admin/users/${id}`, { headers: adminHeaders });
  const read = await readRes.json();
  if (!readRes.ok || read?.email !== email) {
    console.error("FAILED: user could not be read back:", readRes.status, read);
    process.exit(1);
  }
  if (!read?.email_confirmed_at) {
    console.error("FAILED: user exists but email is NOT confirmed — they cannot sign in.");
    process.exit(1);
  }
  console.log(`  ok  email confirmed        ${read.email_confirmed_at}`);

  // 3. The onboarding gate reads profiles; without this row the app misbehaves.
  const profRes = await fetch(
    `${BASE}/rest/v1/profiles?id=eq.${id}&select=id,onboarding_completed`,
    { headers: adminHeaders },
  );
  const profiles = await profRes.json();
  if (!profRes.ok || !Array.isArray(profiles) || profiles.length !== 1) {
    console.error("FAILED: on_auth_user_created did not create a profile row:", profiles);
    process.exit(1);
  }
  console.log(`  ok  profile row created    onboarding_completed=${profiles[0].onboarding_completed}`);

  // 4. The claim that matters: can they actually log in? Uses the public
  //    endpoint with the publishable key, exactly as the login form does.
  const signInRes = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const signIn = await signInRes.json();
  if (!signInRes.ok || !signIn?.access_token) {
    console.error("FAILED: account created but sign-in does not work:", signInRes.status, signIn);
    process.exit(1);
  }
  console.log(`  ok  sign-in verified       access token issued`);

  console.log("\nINVITE: PASS — the account exists, is confirmed, and can log in.\n");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log("\nShare over a channel you trust, not email. They can change it in");
  console.log("Settings > Change password (it requires this password to confirm).");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});

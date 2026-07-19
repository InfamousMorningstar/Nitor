import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanent account deletion.
 *
 * THREAT MODEL — this is the most dangerous endpoint in the app, because a
 * flaw here destroys somebody else's data irrecoverably.
 *
 * The subject of the deletion is read from VERIFIED CLAIMS and from nowhere
 * else. The request body is consulted for exactly one thing: the confirmation
 * word. No user id, email, or any other identifier is read from it, so there
 * is no identifier for an attacker to substitute — the endpoint is structurally
 * incapable of deleting an account other than the caller's own. That is why
 * `sub` is bound to a const before any other work happens and never reassigned.
 *
 * S1: getClaims() verifies the JWT signature against the project's published
 * keys. Never getSession() here — it reads cookie storage shared with the
 * client and is not revalidated, so it would let a forged cookie choose the
 * victim.
 *
 * Deleting the auth user is sufficient to remove everything. profiles.id,
 * habits.user_id and logs.user_id each declare
 * `references auth.users (id) on delete cascade` (supabase/profiles.sql,
 * supabase/habits.sql), and logs additionally cascade from habits through the
 * composite FK. Deleting rows by hand first would be redundant and would open
 * a partial-failure window where the auth user survives with its data gone.
 *
 * SUCCESS NEEDS POSITIVE EVIDENCE. supabase-js RETURNS errors rather than
 * throwing, and an operation affecting zero rows is not an error — so "no
 * error came back" is not proof the user is gone. The deletion is therefore
 * confirmed by re-reading the user and requiring it to be ABSENT before this
 * route reports success.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;

  if (error || typeof sub !== "string" || sub.length === 0) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // An explicit, non-accidental gesture. Parsed after authentication so an
  // unauthenticated caller learns nothing about the expected shape, and
  // wrapped because a malformed or absent body makes .json() reject.
  let confirm: unknown;
  try {
    const body: unknown = await request.json();
    confirm =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).confirm
        : undefined;
  } catch {
    confirm = undefined;
  }

  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== "delete") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: deleteError } = await admin.auth.admin.deleteUser(sub);
  if (deleteError) {
    // Do not sign the user out and do not let the client navigate as though
    // this worked — their account still exists.
    console.error("DELETE /api/account: deleteUser failed", deleteError.message);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // Positive evidence, per the note above: prove the user is actually gone.
  // A surviving user here means the delete silently no-opped, which must be
  // reported as a failure rather than papered over.
  const { data: check, error: checkError } = await admin.auth.admin.getUserById(sub);
  if (!checkError && check?.user) {
    console.error("DELETE /api/account: user still present after delete", sub);
    return NextResponse.json({ error: "delete_unconfirmed" }, { status: 500 });
  }

  // The account is gone, but the caller still holds an access token that stays
  // cryptographically valid until it expires — signature verification says
  // nothing about whether the subject still exists. Clearing the session
  // cookies is what actually ends the session, so a failure to do so is worth
  // logging even though the deletion itself succeeded and cannot be undone.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error("DELETE /api/account: signOut failed", signOutError.message);
  }

  return NextResponse.json({ ok: true });
}

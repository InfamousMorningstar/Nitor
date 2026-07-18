// scripts/verify-rls.ts
// Live RLS isolation + field-fidelity round-trip against the real Supabase project.
// Run: npx tsx --env-file=.env.local scripts/verify-rls.ts
// Uses plain fetch against GoTrue (/auth/v1) and PostgREST (/rest/v1), no new deps.
//
// Design note — why this script is not vacuous:
// A bare "user B reads zero rows" assertion also passes when the endpoint is
// broken, the table is empty, or the request 4xx'd. So every negative assertion
// here is paired with a positive control proving the same request shape DOES
// return data for its rightful owner: B inserts its own habit and log first,
// and we assert B sees exactly its own rows and none of A's. We also assert the
// HTTP status of every request, so a failure names itself instead of silently
// degrading into an empty array.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY",
  );
  process.exit(1);
}

const BASE = url.replace(/\/$/, "");

/** Throws rather than process.exit, so the finally-block cleanup always runs. */
function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const adminHeaders = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

function userHeaders(jwt: string): Record<string, string> {
  return {
    apikey: publishable!,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
}

const anonHeaders: Record<string, string> = {
  apikey: publishable,
  "Content-Type": "application/json",
};

/** One REST round-trip, returning both status and parsed body. */
async function rest(
  path: string,
  init: RequestInit & { headers: Record<string, string> },
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}/rest/v1${path}`, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

function rows(body: unknown): Record<string, unknown>[] {
  assert(Array.isArray(body), `expected an array of rows, got ${JSON.stringify(body)}`);
  return body as Record<string, unknown>[];
}

function ids(body: unknown): string[] {
  return rows(body).map((r) => String(r.id));
}

async function createUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = await res.json();
  assert(res.ok, `create user ${email}: ${res.status} ${JSON.stringify(body)}`);
  return body.id as string;
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishable!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  assert(
    res.ok && Boolean(body.access_token),
    `sign in ${email}: ${res.status} ${JSON.stringify(body)}`,
  );
  return body.access_token as string;
}

/**
 * Cleanup must be loud. A silently-failed admin delete leaves a real user (and
 * its habits and logs) behind in the project, and the next run's "B sees zero
 * of A's rows" assertions would be measuring a dirtier database than they
 * claim to. Returns false rather than throwing, so one failure cannot skip the
 * remaining deletes.
 */
async function deleteUser(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    if (!res.ok) {
      // The id is a random per-run uuid, not a secret. Nothing else is logged.
      console.error(`CLEANUP FAILED: delete user ${id}: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e: unknown) {
    console.error(
      `CLEANUP FAILED: delete user ${id}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

const checks: string[] = [];
function ok(label: string): void {
  checks.push(label);
  console.log(`  ok  ${label}`);
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const aEmail = `rls-a-${stamp}@example.com`;
  const bEmail = `rls-b-${stamp}@example.com`;
  const pw = `Test-passphrase-${stamp}!`;

  // Every user is registered for cleanup the instant it exists, so an
  // exception between the two createUser calls cannot orphan the first one.
  const createdUsers: string[] = [];
  let cleanupOk = true;
  async function createTrackedUser(email: string, password: string): Promise<string> {
    const id = await createUser(email, password);
    createdUsers.push(id);
    return id;
  }

  try {
    const aId = await createTrackedUser(aEmail, pw);
    const bId = await createTrackedUser(bEmail, pw);
    const aJwt = await signIn(aEmail, pw);
    const bJwt = await signIn(bEmail, pw);
    assert(aId !== bId, "A and B are distinct users");
    ok("two confirmed users created and signed in");

    // ---------------------------------------------------------------- A writes
    const aHabitId = `h_${stamp}_a`;
    const aHabit = {
      id: aHabitId,
      name: "Read",
      emoji: "📖",
      color: "#7C5CFF",
      category: "Growth",
      type: "quantified",
      target_value: 30,
      unit: "pages",
      schedule: { kind: "timesPerWeek", timesPerWeek: 4, weekdays: [1, 3, 5] },
      strictness: "balanced",
      grace_days_per_week: 1,
      archived: false,
      created_at: "2026-07-01",
      start_date: "2026-07-01",
      sort_order: 3,
    };
    let r = await rest("/habits", {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify(aHabit),
    });
    assert(r.status === 201, `A insert habit: ${r.status} ${JSON.stringify(r.body)}`);
    const [aInserted] = rows(r.body);
    assert(aInserted.user_id === aId, "A's habit.user_id defaulted to A (server-owned)");
    ok("A inserts a habit; user_id defaults to A without being sent");

    // The habits upsert arbiter, exercised exactly as SupabaseHabitRepository
    // does it: on_conflict names user_id, but the body NEVER sends user_id —
    // it arrives only via DEFAULT auth.uid(). Postgres evaluates the ON
    // CONFLICT inference against the fully-defaulted tuple, so an arbiter
    // column absent from the payload is legal; this asserts that rather than
    // assuming it. Valid against the CURRENT schema because habits already
    // carries unique (user_id, id), which is what makes the repository's
    // switch to onConflict "user_id,id" independently deployable ahead of the
    // primary-key change.
    r = await rest("/habits?on_conflict=user_id,id", {
      method: "POST",
      headers: {
        ...userHeaders(aJwt),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({ ...aHabit, name: "Read (revised)" }),
    });
    assert(
      r.status === 200 || r.status === 201,
      `A upserts its habit on the (user_id, id) arbiter: ${r.status} ${JSON.stringify(r.body)}`,
    );
    const [aUpserted] = rows(r.body);
    assert(
      aUpserted.user_id === aId && aUpserted.name === "Read (revised)",
      `the update branch ran and user_id stayed A's (got ${JSON.stringify(aUpserted)})`,
    );
    assert(
      rows(r.body).length === 1,
      "the arbiter updated in place rather than inserting a duplicate",
    );

    // Restore the name so the field-fidelity assertions below still describe
    // the row they were written for.
    r = await rest(`/habits?id=eq.${aHabitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({ name: "Read" }),
    });
    assert(r.status === 200, `restore A's habit name: ${r.status}`);
    ok("habits upsert resolves on (user_id, id) with user_id never sent by the client");

    // Numeric log, backdated, with freeze set.
    const aLogId = `${aHabitId}_2026-07-02`;
    r = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: aLogId,
        habit_id: aHabitId,
        date: "2026-07-02",
        value: 42,
        note: "n",
        is_grace_day: false,
        is_freeze: true,
        created_at: new Date().toISOString(),
      }),
    });
    assert(r.status === 201, `A insert numeric log: ${r.status} ${JSON.stringify(r.body)}`);

    // Boolean log — Log.value is number | boolean, both must survive jsonb.
    const aBoolLogId = `${aHabitId}_2026-07-03`;
    r = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: aBoolLogId,
        habit_id: aHabitId,
        date: "2026-07-03",
        value: true,
        is_grace_day: true,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(r.status === 201, `A insert boolean log: ${r.status} ${JSON.stringify(r.body)}`);
    ok("A inserts a numeric log and a boolean log");

    // ------------------------------------------------------------- B writes own
    // The positive control: B owns real rows, so "B sees zero of A's" cannot
    // pass merely because B's query returned nothing.
    const bHabitId = `h_${stamp}_b`;
    r = await rest("/habits", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ ...aHabit, id: bHabitId, name: "B's own habit" }),
    });
    assert(r.status === 201, `B insert own habit: ${r.status} ${JSON.stringify(r.body)}`);
    assert(rows(r.body)[0].user_id === bId, "B's habit.user_id defaulted to B");
    ok("B inserts its own habit (positive control for the isolation checks)");

    // B logs against its OWN habit. This is the control the cross-tenant
    // rejections below need: without it, "B's log insert failed" would be
    // consistent with B being unable to write logs at all.
    const bLogId = `${bHabitId}_2026-07-02`;
    r = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: bLogId,
        habit_id: bHabitId,
        date: "2026-07-02",
        value: 7,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(r.status === 201, `B insert own log: ${r.status} ${JSON.stringify(r.body)}`);
    assert(rows(r.body)[0].user_id === bId, "B's log.user_id defaulted to B");

    r = await rest(`/logs?habit_id=eq.${bHabitId}&select=*`, { headers: userHeaders(bJwt) });
    assert(r.status === 200, `B read own log: ${r.status}`);
    const bOwnLogs = rows(r.body);
    assert(
      bOwnLogs.length === 1 && bOwnLogs[0].value === 7,
      `B reads back exactly its own log (got ${JSON.stringify(r.body)})`,
    );
    ok("B creates and reads a log on its own habit (log-write positive control)");

    // ------------------------------------------------------------- A fidelity
    r = await rest(`/habits?id=eq.${aHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(r.status === 200, `A read own habit: ${r.status}`);
    const [got] = rows(r.body);
    assert(got !== undefined, "A can read back its own habit");
    const sched = got.schedule as Record<string, unknown>;
    assert(
      sched.kind === "timesPerWeek" &&
        sched.timesPerWeek === 4 &&
        JSON.stringify(sched.weekdays) === "[1,3,5]",
      `schedule jsonb round-trip (got ${JSON.stringify(sched)})`,
    );
    assert(
      got.target_value === 30 && got.unit === "pages" && got.sort_order === 3,
      "target_value / unit / sort_order round-trip",
    );
    assert(
      got.start_date === "2026-07-01" && got.created_at === "2026-07-01",
      "date strings round-trip verbatim (no timestamp coercion)",
    );
    assert(
      got.type === "quantified" &&
        got.strictness === "balanced" &&
        got.grace_days_per_week === 1 &&
        got.archived === false &&
        got.category === "Growth" &&
        got.emoji === "📖" &&
        got.color === "#7C5CFF",
      "type / strictness / grace / archived / category / emoji / color round-trip",
    );

    r = await rest(`/logs?habit_id=eq.${aHabitId}&select=*&order=date.asc`, {
      headers: userHeaders(aJwt),
    });
    assert(r.status === 200, `A read own logs: ${r.status}`);
    const aLogs = rows(r.body);
    assert(aLogs.length === 2, `A sees exactly its 2 logs (got ${aLogs.length})`);
    assert(
      aLogs[0].value === 42 && aLogs[0].is_freeze === true && aLogs[0].note === "n",
      "numeric log value + freeze + note round-trip",
    );
    assert(
      aLogs[1].value === true && typeof aLogs[1].value === "boolean",
      `boolean log value survives jsonb as a boolean (got ${JSON.stringify(aLogs[1].value)})`,
    );
    assert(aLogs[1].is_grace_day === true, "is_grace_day round-trip");
    ok("every habit and log field round-trips verbatim for its owner");

    // ------------------------------------------------- Isolation: unscoped read
    // Same query shape for both users. A sees only A's row, B sees only B's.
    r = await rest("/habits?select=*", { headers: userHeaders(aJwt) });
    assert(r.status === 200, `A unscoped habit read: ${r.status}`);
    const aVisible = ids(r.body);
    assert(
      aVisible.length === 1 && aVisible[0] === aHabitId,
      `A's unscoped read returns exactly A's habit (got ${JSON.stringify(aVisible)})`,
    );

    r = await rest("/habits?select=*", { headers: userHeaders(bJwt) });
    assert(r.status === 200, `B unscoped habit read: ${r.status}`);
    const bVisible = ids(r.body);
    assert(
      bVisible.length === 1 && bVisible[0] === bHabitId,
      `B's unscoped read returns exactly B's own habit (got ${JSON.stringify(bVisible)})`,
    );
    assert(!bVisible.includes(aHabitId), "B does not see A's habit");
    ok("identical unscoped SELECT returns only each user's own habit");

    // B targeting A's row by id directly.
    r = await rest(`/habits?id=eq.${aHabitId}&select=*`, { headers: userHeaders(bJwt) });
    assert(r.status === 200, `B targeted read of A's habit: ${r.status}`);
    assert(rows(r.body).length === 0, "B reading A's habit by exact id returns zero rows");

    r = await rest("/logs?select=*", { headers: userHeaders(bJwt) });
    assert(r.status === 200, `B unscoped log read: ${r.status}`);
    const bVisibleLogs = rows(r.body);
    // Stronger than "B reads zero logs": B owns one, so this proves the read
    // works AND is scoped, rather than the endpoint merely returning nothing.
    assert(
      bVisibleLogs.length === 1 && bVisibleLogs[0].id === bLogId,
      `B's unscoped log read returns exactly B's own log (got ${JSON.stringify(bVisibleLogs)})`,
    );
    assert(
      bVisibleLogs.every((log) => log.habit_id !== aHabitId && log.user_id === bId),
      "none of the logs B can see belong to A",
    );

    // And targeting A's logs directly yields nothing.
    r = await rest(`/logs?habit_id=eq.${aHabitId}&select=*`, { headers: userHeaders(bJwt) });
    assert(r.status === 200, `B targeted read of A's logs: ${r.status}`);
    assert(rows(r.body).length === 0, "B reading A's logs by habit_id returns zero rows");
    ok("B cannot read A's habit or logs, while reading its own log fine");

    // -------------------------------------------------- Isolation: forged writes
    // The insert with-check, exercised directly: B claims A's user_id.
    r = await rest("/habits", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ ...aHabit, id: `h_${stamp}_forged`, user_id: aId }),
    });
    assert(
      r.status === 403,
      `B forging user_id=A on insert is rejected (expected 403, got ${r.status} ${JSON.stringify(r.body)})`,
    );

    // The update with-check: A tries to hand its own row to B.
    r = await rest(`/habits?id=eq.${aHabitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({ user_id: bId }),
    });
    assert(
      r.status === 403,
      `A reassigning its habit's user_id to B is rejected (expected 403, got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("forged user_id rejected on both INSERT (B→A) and UPDATE (A→B)");

    // B mutating A's row: must affect zero rows, not error-and-look-like-zero.
    r = await rest(`/habits?id=eq.${aHabitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ name: "hacked" }),
    });
    assert(r.status === 200, `B PATCH of A's habit returns 200: got ${r.status}`);
    assert(rows(r.body).length === 0, "B's PATCH of A's habit affects zero rows");

    // Control: the same PATCH shape does work on B's own row.
    r = await rest(`/habits?id=eq.${bHabitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ name: "renamed by B" }),
    });
    assert(
      r.status === 200 && rows(r.body).length === 1,
      `control: B's PATCH of its own row affects 1 row (got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("B's PATCH: zero rows on A's habit, one row on its own (PATCH itself works)");

    r = await rest(`/habits?id=eq.${aHabitId}`, {
      method: "DELETE",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
    });
    assert(r.status === 200, `B DELETE of A's habit returns 200: got ${r.status}`);
    assert(rows(r.body).length === 0, "B's DELETE of A's habit affects zero rows");

    r = await rest(`/logs?habit_id=eq.${aHabitId}`, {
      method: "DELETE",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
    });
    assert(r.status === 200, `B DELETE of A's logs returns 200: got ${r.status}`);
    assert(rows(r.body).length === 0, "B's DELETE of A's logs affects zero rows");
    ok("B's DELETE of A's habit and logs affects zero rows");

    // ------------------------------------------------------- A's data is intact
    r = await rest(`/habits?id=eq.${aHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(r.status === 200, `A re-read after B's attempts: ${r.status}`);
    const [after] = rows(r.body);
    assert(after !== undefined, "A's habit still exists after B's DELETE attempt");
    assert(after.name === "Read", `A's habit name unchanged (got ${String(after.name)})`);
    assert(
      JSON.stringify(after) === JSON.stringify(got),
      "A's habit row is byte-for-byte identical to before B's attempts",
    );

    r = await rest(`/logs?habit_id=eq.${aHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(rows(r.body).length === 2, "A's two logs still present after B's DELETE attempt");
    ok("A's habit row is unchanged and both logs survive");

    // A must not see anything of B's either — isolation is symmetric.
    r = await rest("/habits?select=*", { headers: userHeaders(aJwt) });
    assert(!ids(r.body).includes(bHabitId), "A does not see B's habit (isolation is symmetric)");

    r = await rest(`/habits?id=eq.${bHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      "A reading B's habit by exact id returns zero rows",
    );
    r = await rest(`/logs?habit_id=eq.${bHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      "A reading B's logs by habit_id returns zero rows",
    );

    // A mutating and deleting B's rows: zero rows affected, both directions.
    r = await rest(`/habits?id=eq.${bHabitId}`, {
      method: "PATCH",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({ name: "hacked by A" }),
    });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `A's PATCH of B's habit affects zero rows (got ${r.status} ${JSON.stringify(r.body)})`,
    );
    r = await rest(`/habits?id=eq.${bHabitId}`, {
      method: "DELETE",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
    });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `A's DELETE of B's habit affects zero rows (got ${r.status})`,
    );
    r = await rest(`/logs?habit_id=eq.${bHabitId}`, {
      method: "DELETE",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
    });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `A's DELETE of B's logs affects zero rows (got ${r.status})`,
    );

    // B's data survived A's attempts intact — the mirror of the check above.
    r = await rest(`/habits?id=eq.${bHabitId}&select=*`, { headers: userHeaders(bJwt) });
    const [bAfter] = rows(r.body);
    assert(bAfter !== undefined, "B's habit still exists after A's DELETE attempt");
    assert(
      bAfter.name === "renamed by B",
      `B's habit name is B's own last write, not A's (got ${String(bAfter.name)})`,
    );
    r = await rest(`/logs?habit_id=eq.${bHabitId}&select=*`, { headers: userHeaders(bJwt) });
    assert(rows(r.body).length === 1, "B's log survives A's DELETE attempt");
    ok("isolation is symmetric: A can neither read, update, nor delete B's rows");

    // ------------------------------------------- Cross-tenant FK: the main event
    // Postgres validates foreign keys with RLS BYPASSED. With a single-column
    // logs.habit_id -> habits(id) reference, this insert SUCCEEDED: B ended up
    // owning a log hanging off A's habit, and FK-accept vs FK-reject leaked
    // whether a guessed habit id exists. The composite (user_id, habit_id) ->
    // habits(user_id, id) reference makes it structurally impossible — the row
    // (B, A's habit) simply is not in habits.
    r = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: `${aHabitId}_2026-07-09`,
        habit_id: aHabitId,
        date: "2026-07-09",
        value: 1,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      r.status === 409 || r.status === 400,
      `B's log referencing A's habit is rejected (expected 409/400, got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("B cannot create a log referencing A's habit (composite FK rejects it)");

    // The oracle is gone too: a habit id that exists for NOBODY must be
    // rejected the same way as one that exists for A. Same status, so FK
    // behaviour reveals nothing about A's data.
    const ghostHabitId = `h_${stamp}_does_not_exist`;
    const oracle = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: `${ghostHabitId}_2026-07-09`,
        habit_id: ghostHabitId,
        date: "2026-07-09",
        value: 1,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      oracle.status === r.status,
      `existent-but-foreign and nonexistent habit ids fail identically (${r.status} vs ${oracle.status}) — otherwise FK response is an existence oracle`,
    );
    ok("a foreign habit id and a nonexistent one are rejected identically (no existence oracle)");

    // A's rows are untouched by the attempts: no ghost log landed.
    r = await rest(`/logs?habit_id=eq.${aHabitId}&select=*`, { headers: userHeaders(aJwt) });
    assert(r.status === 200, `A re-read logs after B's FK attempts: ${r.status}`);
    assert(
      rows(r.body).length === 2,
      `A still sees exactly its own 2 logs, no ghost row (got ${rows(r.body).length})`,
    );
    ok("no cross-tenant ghost log exists on A's habit");

    // ------------------------------------------------------- Id preemption
    // Log ids are the deterministic `${habitId}_${date}`. While logs.id was
    // GLOBALLY primary, B could insert that exact string and A's later write
    // for the same date would fail on the primary key — a targeted denial of
    // service, and a conflict on an index that is NOT the declared
    // (user_id, habit_id, date) upsert arbiter. With the key now
    // (user_id, id), B claiming the string affects only B's own tenant.
    const contestedId = `${aHabitId}_2026-07-10`;
    r = await rest("/logs", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({
        id: contestedId,
        habit_id: bHabitId, // B's own habit — the FK is satisfied
        date: "2026-07-10",
        value: 99,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      r.status === 201,
      `B may use that id string inside its own tenant: ${r.status} ${JSON.stringify(r.body)}`,
    );

    // A now writes the id B just claimed. This is the assertion that would
    // have failed before the fix.
    //
    // ?on_conflict= is load-bearing: without it PostgREST arbitrates on the
    // PRIMARY KEY, so this would exercise (user_id, id) and silently fail to
    // test the target logValue() actually declares. The query string mirrors
    // SupabaseHabitRepository's `onConflict: "user_id,habit_id,date"`.
    r = await rest("/logs?on_conflict=user_id,habit_id,date", {
      method: "POST",
      headers: {
        ...userHeaders(aJwt),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: contestedId,
        habit_id: aHabitId,
        date: "2026-07-10",
        value: 5,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      r.status === 201 || r.status === 200,
      `A can still write the id B claimed: ${r.status} ${JSON.stringify(r.body)}`,
    );
    const [aContested] = rows(r.body);
    assert(
      aContested.value === 5 && aContested.user_id === aId,
      `A's row holds A's value, not B's (got ${JSON.stringify(aContested)})`,
    );

    // And the upsert path itself still resolves on the declared arbiter,
    // updating in place rather than raising a duplicate-key error.
    r = await rest("/logs?on_conflict=user_id,habit_id,date", {
      method: "POST",
      headers: {
        ...userHeaders(aJwt),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: contestedId,
        habit_id: aHabitId,
        date: "2026-07-10",
        value: 11,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      (r.status === 200 || r.status === 201) && rows(r.body)[0].value === 11,
      `A's re-upsert of the same date updates in place: ${r.status} ${JSON.stringify(r.body)}`,
    );
    ok("B cannot preempt A's deterministic log id; A's write and re-upsert both succeed");

    // Proof that the DECLARED arbiter is the one doing the work, not the
    // primary key. The incoming id differs from the stored row's id while
    // (user_id, habit_id, date) still matches. Arbitrating on (user_id, id)
    // would find no conflict and INSERT a second row for the same date;
    // arbitrating on (user_id, habit_id, date) updates the existing row and
    // rewrites its id. The row count is what separates the two outcomes.
    const renamedId = `${aHabitId}_2026-07-10_v2`;
    r = await rest("/logs?on_conflict=user_id,habit_id,date", {
      method: "POST",
      headers: {
        ...userHeaders(aJwt),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: renamedId,
        habit_id: aHabitId,
        date: "2026-07-10",
        value: 13,
        is_grace_day: false,
        is_freeze: false,
        created_at: new Date().toISOString(),
      }),
    });
    assert(
      r.status === 200 || r.status === 201,
      `A's upsert with a differing id resolves on the declared arbiter: ${r.status} ${JSON.stringify(r.body)}`,
    );

    r = await rest(`/logs?habit_id=eq.${aHabitId}&date=eq.2026-07-10&select=*`, {
      headers: userHeaders(aJwt),
    });
    const dayRows = rows(r.body);
    assert(
      dayRows.length === 1,
      `exactly one log survives for that date — the arbiter updated rather than inserted (got ${dayRows.length}: ${JSON.stringify(dayRows)})`,
    );
    assert(
      dayRows[0].id === renamedId && dayRows[0].value === 13,
      `the surviving row carries the new id and value (got ${JSON.stringify(dayRows[0])})`,
    );
    ok("upserts resolve on the declared (user_id, habit_id, date) arbiter, not the primary key");

    // --------------------------------------------- Habit-id preemption
    // The habit-level mirror of the log-id check above. While habits.id was
    // GLOBALLY primary, B could insert a habit carrying an id A was about to
    // use; A's upsert then collided with a row RLS made invisible to A, so A's
    // own habit could never be created — a cross-tenant denial of service, and
    // an existence oracle on habit ids. With the key now (user_id, id), B's
    // claim is confined to B's own tenant.
    const contestedHabitId = `h_${stamp}_contested`;
    r = await rest("/habits", {
      method: "POST",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ ...aHabit, id: contestedHabitId, name: "B claims the id" }),
    });
    assert(
      r.status === 201,
      `B may use that habit id inside its own tenant: ${r.status} ${JSON.stringify(r.body)}`,
    );

    // A now creates its own habit under the id B just claimed. This is the
    // assertion that would have failed before the fix.
    r = await rest("/habits?on_conflict=user_id,id", {
      method: "POST",
      headers: {
        ...userHeaders(aJwt),
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({ ...aHabit, id: contestedHabitId, name: "A's real habit" }),
    });
    assert(
      r.status === 200 || r.status === 201,
      `A can still create the habit id B claimed: ${r.status} ${JSON.stringify(r.body)}`,
    );
    const [aContestedHabit] = rows(r.body);
    assert(
      aContestedHabit.user_id === aId && aContestedHabit.name === "A's real habit",
      `A's row carries A's values, not B's (got ${JSON.stringify(aContestedHabit)})`,
    );

    // Each tenant sees exactly its own version of that id, and only its own.
    r = await rest(`/habits?id=eq.${contestedHabitId}&select=*`, { headers: userHeaders(aJwt) });
    const aSees = rows(r.body);
    assert(
      aSees.length === 1 && aSees[0].name === "A's real habit",
      `A sees only its own contested habit (got ${JSON.stringify(aSees)})`,
    );
    r = await rest(`/habits?id=eq.${contestedHabitId}&select=*`, { headers: userHeaders(bJwt) });
    const bSees = rows(r.body);
    assert(
      bSees.length === 1 && bSees[0].name === "B claims the id",
      `B still sees its own, untouched by A's write (got ${JSON.stringify(bSees)})`,
    );
    ok("B cannot preempt a habit id; both tenants hold their own row under it");

    // --------------------------------------------------------------- Profiles
    // "VERIFY-RLS: PASS" reads as a whole-database verdict, so it should not
    // certify only two of the four tables. profiles carries the trust flag the
    // auth gate reads (onboarding_completed), which makes it the last table
    // that should go unchecked.
    r = await rest(`/profiles?select=*`, { headers: userHeaders(aJwt) });
    assert(r.status === 200, `A reads profiles: ${r.status}`);
    const aProfiles = rows(r.body);
    assert(
      aProfiles.length === 1 && aProfiles[0].id === aId,
      `A sees exactly its own profile (got ${JSON.stringify(aProfiles)})`,
    );

    r = await rest(`/profiles?id=eq.${aId}&select=*`, { headers: userHeaders(bJwt) });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `B reading A's profile by exact id returns zero rows (got ${r.status} ${JSON.stringify(r.body)})`,
    );

    r = await rest(`/profiles?id=eq.${aId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ onboarding_completed: true }),
    });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `B's PATCH of A's profile affects zero rows (got ${r.status} ${JSON.stringify(r.body)})`,
    );

    // Control: the same PATCH shape works on B's own row, so the zero above is
    // scoping rather than a broken request.
    r = await rest(`/profiles?id=eq.${bId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ onboarding_completed: true }),
    });
    assert(
      r.status === 200 && rows(r.body).length === 1,
      `control: B's PATCH of its own profile affects 1 row (got ${r.status} ${JSON.stringify(r.body)})`,
    );

    // created_at is deliberately outside the column grant (profiles.sql), so
    // honest metadata stays honest even on your own row.
    r = await rest(`/profiles?id=eq.${bId}`, {
      method: "PATCH",
      headers: { ...userHeaders(bJwt), Prefer: "return=representation" },
      body: JSON.stringify({ created_at: "1999-01-01T00:00:00Z" }),
    });
    assert(
      r.status === 403 || r.status === 401,
      `B rewriting its own created_at is refused by the column grant (expected 401/403, got ${r.status} ${JSON.stringify(r.body)})`,
    );

    r = await rest("/profiles?select=*", { headers: anonHeaders });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `anon reads zero profiles (got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("profiles: own-row only, no cross-user read or write, created_at ungrantable, anon blocked");

    // ----------------------------------------------------------------- Quotes
    // quotes is deliberately world-readable and nobody-writable.
    r = await rest("/quotes?select=id&limit=1", { headers: userHeaders(aJwt) });
    assert(r.status === 200, `authenticated can read quotes: ${r.status}`);
    r = await rest("/quotes", {
      method: "POST",
      headers: { ...userHeaders(aJwt), Prefer: "return=representation" },
      body: JSON.stringify({ text: `injected ${stamp}`, author: "x", tradition: "stoic" }),
    });
    assert(
      r.status === 401 || r.status === 403,
      `authenticated INSERT into quotes is refused (expected 401/403, got ${r.status} ${JSON.stringify(r.body)})`,
    );
    r = await rest("/quotes", {
      method: "POST",
      headers: { ...anonHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ text: `injected anon ${stamp}`, author: "x", tradition: "stoic" }),
    });
    assert(
      r.status === 401 || r.status === 403,
      `anon INSERT into quotes is refused (expected 401/403, got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("quotes: readable, but writable by neither authenticated nor anon");

    // ------------------------------------------------------------------- Anon
    r = await rest("/habits?select=*", { headers: anonHeaders });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `anon reads zero habits (got ${r.status} ${JSON.stringify(r.body)})`,
    );
    r = await rest("/logs?select=*", { headers: anonHeaders });
    assert(
      r.status === 200 && rows(r.body).length === 0,
      `anon reads zero logs (got ${r.status} ${JSON.stringify(r.body)})`,
    );
    r = await rest(`/habits?id=eq.${aHabitId}&select=*`, { headers: anonHeaders });
    assert(rows(r.body).length === 0, "anon reading A's habit by exact id returns zero rows");
    r = await rest("/habits", {
      method: "POST",
      headers: { ...anonHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ ...aHabit, id: `h_${stamp}_anon` }),
    });
    assert(
      r.status === 401 || r.status === 403,
      `anon INSERT is rejected (expected 401/403, got ${r.status} ${JSON.stringify(r.body)})`,
    );
    ok("anon reads zero rows and cannot insert");

    console.log(`\n${checks.length} checks passed.`);
  } finally {
    // Cascades remove both users' habits and logs. Every registered user is
    // attempted even if an earlier delete fails.
    const results = await Promise.all(createdUsers.map(deleteUser));
    cleanupOk = results.every(Boolean);
  }

  // Deliberately AFTER the finally block. Printing PASS inside the try meant a
  // run that leaked live test users still reported PASS and exited 0 — the
  // exact silent failure deleteUser() was made loud to prevent. A leaked user
  // also poisons the next run's "sees zero of A's rows" assertions, so this is
  // a real failure, not a cosmetic one.
  if (!cleanupOk) {
    throw new Error(
      "checks passed but cleanup failed — test users remain in the project and need manual removal",
    );
  }
  console.log("VERIFY-RLS: PASS");
}

main().catch((e: unknown) => {
  console.error(`VERIFY-RLS: FAIL — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

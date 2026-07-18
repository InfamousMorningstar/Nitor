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

async function deleteUser(id: string): Promise<void> {
  await fetch(`${BASE}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: adminHeaders });
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

  const aId = await createUser(aEmail, pw);
  const bId = await createUser(bEmail, pw);

  try {
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
    assert(rows(r.body).length === 0, "B reads zero logs (A's two are hidden)");
    ok("B cannot read A's habit by id, and sees none of A's logs");

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
    ok("isolation is symmetric: A sees none of B's rows");

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
    console.log("VERIFY-RLS: PASS");
  } finally {
    // Cascades remove both users' habits and logs.
    await deleteUser(aId);
    await deleteUser(bId);
  }
}

main().catch((e: unknown) => {
  console.error(`VERIFY-RLS: FAIL — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

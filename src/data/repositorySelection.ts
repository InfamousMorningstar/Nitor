import type { HabitRepository } from "./repository";

/**
 * Chooses the repository for the current session.
 *
 * Returns null while the session is still resolving, because at that moment
 * there IS no correct repository and any answer is a lie. Handing back the
 * seeded mock — as this used to — did not avoid a flash of the wrong data, it
 * caused one: five fabricated habits with six weeks of logs rendered as the
 * user's own until getUser() came back. Worse, anything the user did in that
 * window ran against the mock and was discarded on the swap, and an export
 * taken then contained demo data.
 *
 * Callers must treat null as "not ready": show loading, read nothing, write
 * nothing. An authenticated user gets the Supabase repo (per-user isolation
 * via RLS, never app-side filters); a settled signed-out visitor gets the
 * seeded in-memory mock, which is the intended guest experience.
 */
export function pickRepository(args: {
  loading: boolean;
  userId: string | null;
  mock: HabitRepository;
  makeSupabase: () => HabitRepository;
}): HabitRepository | null {
  const { loading, userId, mock, makeSupabase } = args;
  if (loading) return null;
  if (!userId) return mock;
  return makeSupabase();
}

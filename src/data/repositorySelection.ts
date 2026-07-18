import type { HabitRepository } from "./repository";

/**
 * Chooses the repository for the current session. While the session is still
 * resolving we hold the mock to avoid a flash of the wrong data; an
 * authenticated user gets the Supabase repo (per-user isolation via RLS);
 * everyone else gets the seeded in-memory mock (guest experience).
 */
export function pickRepository(args: {
  loading: boolean;
  userId: string | null;
  mock: HabitRepository;
  makeSupabase: () => HabitRepository;
}): HabitRepository {
  const { loading, userId, mock, makeSupabase } = args;
  if (loading || !userId) return mock;
  return makeSupabase();
}

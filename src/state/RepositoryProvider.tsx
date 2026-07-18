"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import { SupabaseHabitRepository } from "@/data/SupabaseHabitRepository";
import { pickRepository } from "@/data/repositorySelection";
import type { HabitRepository } from "@/data/repository";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/state/SessionProvider";
import { loadRemoteQuotes } from "@/data/quotes/remote";

const Ctx = createContext<HabitRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  // The guest/unauthenticated repository, created once and reused so signed-out
  // browsing keeps the seeded demo data stable across renders.
  const mockRef = useRef<HabitRepository | null>(null);
  if (!mockRef.current) mockRef.current = createSeededRepository();

  // While the session resolves we hold the mock; an authenticated user gets a
  // Supabase repo rebuilt only when their id changes (login/logout). Per-user
  // isolation is enforced by RLS, not by app-side filters.
  const repository = useMemo(
    () =>
      pickRepository({
        loading,
        userId: user?.id ?? null,
        mock: mockRef.current as HabitRepository,
        makeSupabase: () => new SupabaseHabitRepository(createClient()),
      }),
    [loading, user?.id],
  );

  // Top up the bundled quote pool from Supabase, if configured; no-op
  // otherwise. Fires once on mount, independent of which repository is active.
  useEffect(() => {
    void loadRemoteQuotes();
  }, []);

  return <Ctx.Provider value={repository}>{children}</Ctx.Provider>;
}

export function useRepository(): HabitRepository {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRepository must be used within RepositoryProvider");
  return c;
}

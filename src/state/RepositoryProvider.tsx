"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import { SupabaseHabitRepository } from "@/data/SupabaseHabitRepository";
import { pickRepository } from "@/data/repositorySelection";
import type { HabitRepository } from "@/data/repository";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/state/SessionProvider";
import { loadRemoteQuotes } from "@/data/quotes/remote";

/**
 * Wrapped in an object so a null REPOSITORY (session still resolving) stays
 * distinguishable from a null CONTEXT (used outside the provider) — the second
 * is a programming error and must keep throwing.
 */
const Ctx = createContext<{ repository: HabitRepository | null } | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  // The guest/unauthenticated repository, created once and reused so signed-out
  // browsing keeps the seeded demo data stable across renders.
  const mockRef = useRef<HabitRepository | null>(null);
  if (!mockRef.current) mockRef.current = createSeededRepository();

  // Null while the session resolves — consumers must show loading rather than
  // read or write anything. An authenticated user gets a Supabase repo rebuilt
  // only when their id changes (login/logout). Per-user isolation is enforced
  // by RLS, not by app-side filters.
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

  const value = useMemo(() => ({ repository }), [repository]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The active repository, or null while the session is still resolving.
 *
 * Null means NOT READY, not "use a fallback": read nothing, write nothing, and
 * render a loading state until it settles.
 */
export function useRepository(): HabitRepository | null {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRepository must be used within RepositoryProvider");
  return c.repository;
}

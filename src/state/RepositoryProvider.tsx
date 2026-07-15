"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import type { HabitRepository } from "@/data/repository";
import { loadRemoteQuotes } from "@/data/quotes/remote";

const Ctx = createContext<HabitRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HabitRepository | null>(null);
  if (!ref.current) ref.current = createSeededRepository();

  // Top up the bundled quote pool from Supabase, if configured; no-op
  // otherwise. Fires once on mount, same lifecycle as the repository itself.
  useEffect(() => {
    void loadRemoteQuotes();
  }, []);

  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useRepository(): HabitRepository {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRepository must be used within RepositoryProvider");
  return c;
}

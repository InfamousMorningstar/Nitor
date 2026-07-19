"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
}

interface SessionValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadProfile(id: string) {
      // RLS restricts this to the caller's own row — no user filter needed,
      // but .eq() keeps the intent obvious to the next reader.
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, onboarding_completed")
        .eq("id", id)
        .maybeSingle();
      if (active) setProfile(data ?? null);
    }

    // getUser() revalidates against the Auth server; never getSession() (S1).
    void supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!active) return;
        setUser(data.user ?? null);
        if (data.user) await loadProfile(data.user.id);
      })
      .catch(() => {
        // getUser returns AuthErrors as { error }; a throw is a network-layer
        // failure. Fall through to the signed-out display state — anything is
        // better than `loading` stuck true forever.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // getUser() above owns the initial load (with server revalidation);
      // reacting to INITIAL_SESSION too would double-fetch the profile.
      if (event === "INITIAL_SESSION") return;
      const next = session?.user ?? null;
      setUser(next);
      if (next) void loadProfile(next.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }, []);

  // Memoized so consumers (every page, via the root layout) don't re-render
  // for provider renders that changed none of these.
  const value = useMemo(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRepository } from "./RepositoryProvider";
import type { HabitRepository, LogInput } from "@/data/repository";
import type { Habit, Log } from "@/domain/types";

const LOAD_FAILED = "Couldn't load your habits. Check your connection and try again.";
const SAVE_FAILED = "Couldn't save that. Check your connection and try again.";

// Stable empty references, so a stale snapshot never hands out a fresh array
// and retriggers every downstream useMemo.
const NO_HABITS: Habit[] = [];
const NO_LOGS: Log[] = [];

/**
 * Data is stored TAGGED with the repository it came from, rather than being
 * cleared imperatively when the repository changes. Anything carrying a
 * different repository than the current one is simply not this session's data
 * and is never handed out — which is what stops a read that was already in
 * flight from painting after a swap. On sign-out that matters: the previous
 * user's habits resolving onto a signed-out screen is, on a shared machine, a
 * data leak rather than a glitch.
 */
type Snapshot = {
  repo: HabitRepository | null;
  habits: Habit[];
  logs: Log[];
  error: string | null;
  loaded: boolean;
};

const INITIAL: Snapshot = {
  repo: null,
  habits: NO_HABITS,
  logs: NO_LOGS,
  error: null,
  loaded: false,
};

export function useHabits() {
  const repo = useRepository();
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL);

  // Guards ordering WITHIN one repository: two overlapping refreshes must not
  // apply out of order. The repo tag above handles the across-repository case.
  const epochRef = useRef(0);

  // A snapshot from another repository is not this session's data.
  const current = snapshot.repo === repo ? snapshot : null;
  const habits = current?.habits ?? NO_HABITS;
  const logs = current?.logs ?? NO_LOGS;
  const error = current?.error ?? null;
  const loading = !current?.loaded;

  const refresh = useCallback(async () => {
    // Session unsettled: there is no repository to read from yet. Handing back
    // the seeded mock here rendered five fabricated habits as the user's own.
    if (!repo) return;

    const epoch = ++epochRef.current;
    try {
      const [h, l] = await Promise.all([repo.listHabits(), repo.listLogs()]);
      if (epoch !== epochRef.current) return;
      setSnapshot({ repo, habits: h, logs: l, error: null, loaded: true });
    } catch {
      if (epoch !== epochRef.current) return;
      // The repository throws on any PostgREST/RLS error. Unhandled, this left
      // `loading` stuck true and the page spinning forever.
      setSnapshot((prev) => ({
        repo,
        habits: prev.repo === repo ? prev.habits : NO_HABITS,
        logs: prev.repo === repo ? prev.logs : NO_LOGS,
        error: LOAD_FAILED,
        loaded: true,
      }));
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Returns whether the write actually landed. Deliberately does NOT throw:
   * callers invoke this from event handlers as a floating promise, where a
   * rejection becomes an unhandled rejection and the user sees nothing at all.
   */
  const log = useCallback(
    async (input: LogInput): Promise<boolean> => {
      if (!repo) return false;
      try {
        await repo.logValue(input);
      } catch {
        setSnapshot((prev) =>
          prev.repo === repo ? { ...prev, error: SAVE_FAILED } : prev,
        );
        return false;
      }
      await refresh();
      return true;
    },
    [repo, refresh],
  );

  return { habits, logs, loading, error, log, refresh };
}

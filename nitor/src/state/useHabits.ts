"use client";
import { useCallback, useEffect, useState } from "react";
import { useRepository } from "./RepositoryProvider";
import type { Habit, Log } from "@/domain/types";
import type { LogInput } from "@/data/repository";

export function useHabits() {
  const repo = useRepository();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [h, l] = await Promise.all([repo.listHabits(), repo.listLogs()]);
    setHabits(h);
    setLogs(l);
    setLoading(false);
  }, [repo]);

  useEffect(() => { void refresh(); }, [refresh]);

  const log = useCallback(async (input: LogInput) => {
    await repo.logValue(input);
    await refresh();
  }, [repo, refresh]);

  return { habits, logs, loading, log, refresh };
}

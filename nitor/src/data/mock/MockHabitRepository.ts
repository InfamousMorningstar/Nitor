import type { Habit, Log } from "@/domain/types";
import type { HabitRepository, LogInput } from "@/data/repository";
import { buildSeed } from "./seed";

export class MockHabitRepository implements HabitRepository {
  private habits: Habit[];
  private logs: Log[];

  constructor(seed: { habits: Habit[]; logs: Log[] }) {
    this.habits = seed.habits;
    this.logs = seed.logs;
  }

  async listHabits(): Promise<Habit[]> {
    return this.habits.filter((h) => !h.archived).map((h) => ({ ...h }));
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const h = this.habits.find((x) => x.id === id);
    return h ? { ...h } : undefined;
  }

  async listLogs(habitId?: string): Promise<Log[]> {
    const out = habitId ? this.logs.filter((l) => l.habitId === habitId) : this.logs;
    return out.map((l) => ({ ...l }));
  }

  async logValue(input: LogInput): Promise<Log> {
    const idx = this.logs.findIndex((l) => l.habitId === input.habitId && l.date === input.date);
    const log: Log = {
      id: `${input.habitId}_${input.date}`,
      habitId: input.habitId,
      date: input.date,
      value: input.value,
      note: input.note,
      isGraceDay: input.isGraceDay ?? false,
      createdAt: new Date().toISOString(),
    };
    if (idx >= 0) this.logs[idx] = log;
    else this.logs.push(log);
    return { ...log };
  }

  async upsertHabit(habit: Habit): Promise<Habit> {
    const idx = this.habits.findIndex((h) => h.id === habit.id);
    if (idx >= 0) this.habits[idx] = { ...habit };
    else this.habits.push({ ...habit });
    return { ...habit };
  }

  async archiveHabit(id: string): Promise<void> {
    const h = this.habits.find((x) => x.id === id);
    if (h) h.archived = true;
  }
}

export function createSeededRepository(): HabitRepository {
  return new MockHabitRepository(buildSeed());
}

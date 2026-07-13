import type { Habit, Log } from "@/domain/types";

export interface LogInput {
  habitId: string;
  date: string;
  value: number | boolean;
  note?: string;
  isGraceDay?: boolean;
}

export interface HabitRepository {
  listHabits(): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  listLogs(habitId?: string): Promise<Log[]>;
  logValue(input: LogInput): Promise<Log>;
  upsertHabit(habit: Habit): Promise<Habit>;
  archiveHabit(id: string): Promise<void>;
  deleteHabit(id: string): Promise<void>;
}

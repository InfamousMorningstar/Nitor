import type { SupabaseClient } from "@supabase/supabase-js";
import type { HabitRepository, LogInput } from "@/data/repository";
import type { Habit, HabitType, Log, Schedule, Strictness } from "@/domain/types";

interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  type: HabitType;
  target_value: number | null;
  schedule: Schedule;
  strictness: Strictness;
  grace_days_per_week: number;
  archived: boolean;
  created_at: string;
  unit: string | null;
  start_date: string | null;
  sort_order: number | null;
}

interface LogRow {
  id: string;
  habit_id: string;
  date: string;
  value: number | boolean;
  note: string | null;
  is_grace_day: boolean;
  is_freeze: boolean;
  created_at: string;
}

type QueryError = { message: string } | null;

function throwIfError(error: QueryError): void {
  if (error) throw new Error(error.message);
}

function cloneSchedule(schedule: Schedule): Schedule {
  return {
    ...schedule,
    ...(schedule.weekdays ? { weekdays: [...schedule.weekdays] } : {}),
  };
}

function habitFromRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    category: row.category,
    type: row.type,
    targetValue: row.target_value,
    schedule: cloneSchedule(row.schedule),
    strictness: row.strictness,
    graceDaysPerWeek: row.grace_days_per_week,
    archived: row.archived,
    createdAt: row.created_at,
    ...(row.unit !== null ? { unit: row.unit } : {}),
    ...(row.start_date !== null ? { startDate: row.start_date } : {}),
    ...(row.sort_order !== null ? { order: row.sort_order } : {}),
  };
}

function habitToRow(habit: Habit): HabitRow {
  return {
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji,
    color: habit.color,
    category: habit.category,
    type: habit.type,
    target_value: habit.targetValue,
    schedule: cloneSchedule(habit.schedule),
    strictness: habit.strictness,
    grace_days_per_week: habit.graceDaysPerWeek,
    archived: habit.archived,
    created_at: habit.createdAt,
    unit: habit.unit ?? null,
    start_date: habit.startDate ?? null,
    sort_order: habit.order ?? null,
  };
}

function logFromRow(row: LogRow): Log {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    value: row.value,
    ...(row.note !== null ? { note: row.note } : {}),
    isGraceDay: row.is_grace_day,
    isFreeze: row.is_freeze,
    createdAt: row.created_at,
  };
}

export class SupabaseHabitRepository implements HabitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listHabits(): Promise<Habit[]> {
    const { data, error } = await this.client
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    throwIfError(error);
    return ((data ?? []) as HabitRow[]).map(habitFromRow);
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const { data, error } = await this.client
      .from("habits")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    throwIfError(error);
    return data ? habitFromRow(data as HabitRow) : undefined;
  }

  async listLogs(habitId?: string): Promise<Log[]> {
    let query = this.client.from("logs").select("*");
    if (habitId) query = query.eq("habit_id", habitId);
    const { data, error } = await query;

    throwIfError(error);
    return ((data ?? []) as LogRow[]).map(logFromRow);
  }

  async logValue(input: LogInput): Promise<Log> {
    const row = {
      id: `${input.habitId}_${input.date}`,
      habit_id: input.habitId,
      date: input.date,
      value: input.value,
      note: input.note ?? null,
      is_grace_day: input.isGraceDay ?? false,
      is_freeze: input.isFreeze ?? false,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from("logs")
      .upsert(row, { onConflict: "user_id,habit_id,date" })
      .select()
      .single();

    throwIfError(error);
    if (!data) throw new Error("Supabase did not return the saved log");
    return logFromRow(data as LogRow);
  }

  async upsertHabit(habit: Habit): Promise<Habit> {
    const { data, error } = await this.client
      .from("habits")
      .upsert(habitToRow(habit), { onConflict: "id" })
      .select()
      .single();

    throwIfError(error);
    if (!data) throw new Error("Supabase did not return the saved habit");
    return habitFromRow(data as HabitRow);
  }

  async archiveHabit(id: string): Promise<void> {
    const { error } = await this.client
      .from("habits")
      .update({ archived: true })
      .eq("id", id);

    throwIfError(error);
  }

  async deleteHabit(id: string): Promise<void> {
    const { error } = await this.client.from("habits").delete().eq("id", id);
    throwIfError(error);
  }
}

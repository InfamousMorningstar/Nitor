import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseHabitRepository } from "@/data/SupabaseHabitRepository";
import type { Habit, Log } from "@/domain/types";

type QueryResult = { data: unknown; error: { message: string } | null };
type QueryCall = { method: string; args: unknown[] };

class QueryDouble implements PromiseLike<QueryResult> {
  readonly calls: QueryCall[] = [];

  constructor(
    readonly table: string,
    private readonly result: QueryResult,
  ) {}

  select(...args: unknown[]) {
    this.calls.push({ method: "select", args });
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push({ method: "eq", args });
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push({ method: "order", args });
    return this;
  }

  upsert(...args: unknown[]) {
    this.calls.push({ method: "upsert", args });
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push({ method: "update", args });
    return this;
  }

  delete(...args: unknown[]) {
    this.calls.push({ method: "delete", args });
    return this;
  }

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve(this.result);
  }

  single() {
    this.calls.push({ method: "single", args: [] });
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function createClientDouble(results: QueryResult[]) {
  const queries: QueryDouble[] = [];
  const client = {
    from: vi.fn((table: string) => {
      const result = results.shift();
      if (!result) throw new Error(`Missing query result for ${table}`);
      const query = new QueryDouble(table, result);
      queries.push(query);
      return query;
    }),
  };
  return { client: client as unknown as SupabaseClient, queries };
}

const schedule = {
  kind: "weekdays" as const,
  weekdays: [1, 3, 5],
  timesPerWeek: 3,
  everyNDays: 2,
  monthlyDay: 14,
};

const habitRow = {
  id: "habit-1",
  name: "Deep work",
  emoji: "🎯",
  color: "#F5B027",
  category: "Work",
  type: "duration",
  target_value: 45,
  schedule,
  strictness: "strict",
  grace_days_per_week: 0,
  archived: false,
  created_at: "2026-07-01",
  unit: "minutes",
  start_date: "2026-07-02",
  sort_order: 4,
};

const habit: Habit = {
  id: "habit-1",
  name: "Deep work",
  emoji: "🎯",
  color: "#F5B027",
  category: "Work",
  type: "duration",
  targetValue: 45,
  schedule,
  strictness: "strict",
  graceDaysPerWeek: 0,
  archived: false,
  createdAt: "2026-07-01",
  unit: "minutes",
  startDate: "2026-07-02",
  order: 4,
};

const numericLogRow = {
  id: "habit-1_2026-06-29",
  habit_id: "habit-1",
  date: "2026-06-29",
  value: 30,
  note: "Backfilled",
  is_grace_day: false,
  is_freeze: true,
  created_at: "2026-07-01T12:00:00.000Z",
};

const numericLog: Log = {
  id: "habit-1_2026-06-29",
  habitId: "habit-1",
  date: "2026-06-29",
  value: 30,
  note: "Backfilled",
  isGraceDay: false,
  isFreeze: true,
  createdAt: "2026-07-01T12:00:00.000Z",
};

describe("SupabaseHabitRepository", () => {
  it("implements the repository contract using RLS-scoped browser-client queries", async () => {
    const { client, queries } = createClientDouble([
      { data: [habitRow], error: null },
      { data: habitRow, error: null },
      { data: [numericLogRow], error: null },
      { data: numericLogRow, error: null },
      { data: habitRow, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    const repository = new SupabaseHabitRepository(client);

    await expect(repository.listHabits()).resolves.toEqual([habit]);
    await expect(repository.getHabit("habit-1")).resolves.toEqual(habit);
    await expect(repository.listLogs("habit-1")).resolves.toEqual([numericLog]);
    await expect(
      repository.logValue({
        habitId: "habit-1",
        date: "2026-06-29",
        value: 30,
        note: "Backfilled",
        isFreeze: true,
      }),
    ).resolves.toEqual(numericLog);
    await expect(repository.upsertHabit(habit)).resolves.toEqual(habit);
    await expect(repository.archiveHabit("habit-1")).resolves.toBeUndefined();
    await expect(repository.deleteHabit("habit-1")).resolves.toBeUndefined();

    expect(queries).toHaveLength(7);
    expect(queries[0].calls).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["archived", false] },
      { method: "order", args: ["sort_order", { ascending: true, nullsFirst: false }] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
    expect(queries[1].calls).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["id", "habit-1"] },
      { method: "maybeSingle", args: [] },
    ]);
    expect(queries[2].calls).toContainEqual({ method: "eq", args: ["habit_id", "habit-1"] });
    expect(queries[3].calls).toEqual([
      {
        method: "upsert",
        args: [
          {
            id: "habit-1_2026-06-29",
            habit_id: "habit-1",
            date: "2026-06-29",
            value: 30,
            note: "Backfilled",
            is_grace_day: false,
            is_freeze: true,
            created_at: expect.any(String),
          },
          { onConflict: "user_id,habit_id,date" },
        ],
      },
      { method: "select", args: [] },
      { method: "single", args: [] },
    ]);
    expect(queries[4].calls).toEqual([
      {
        method: "upsert",
        args: [habitRow, { onConflict: "id" }],
      },
      { method: "select", args: [] },
      { method: "single", args: [] },
    ]);
    expect(queries[5].calls).toEqual([
      { method: "update", args: [{ archived: true }] },
      { method: "eq", args: ["id", "habit-1"] },
    ]);
    expect(queries[6].calls).toEqual([
      { method: "delete", args: [] },
      { method: "eq", args: ["id", "habit-1"] },
    ]);

    for (const query of queries) {
      expect(query.calls).not.toContainEqual({
        method: "eq",
        args: ["user_id", expect.anything()],
      });
      for (const call of query.calls) {
        expect(call.args).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ user_id: expect.anything() })]),
        );
      }
    }
  });

  it("round-trips nullable fields and boolean log values without coercion", async () => {
    const minimalHabitRow = {
      ...habitRow,
      target_value: null,
      unit: null,
      start_date: null,
      sort_order: null,
    };
    const booleanLogRow = {
      ...numericLogRow,
      id: "habit-1_2026-07-03",
      date: "2026-07-03",
      value: false,
      note: null,
      is_freeze: false,
    };
    const { client, queries } = createClientDouble([
      { data: minimalHabitRow, error: null },
      { data: [booleanLogRow], error: null },
    ]);
    const repository = new SupabaseHabitRepository(client);

    await expect(repository.getHabit("habit-1")).resolves.toEqual({
      ...habit,
      targetValue: null,
      unit: undefined,
      startDate: undefined,
      order: undefined,
    });
    await expect(repository.listLogs()).resolves.toEqual([
      {
        ...numericLog,
        id: "habit-1_2026-07-03",
        date: "2026-07-03",
        value: false,
        note: undefined,
        isFreeze: false,
      },
    ]);
    expect(queries[0].calls).not.toContainEqual(
      expect.objectContaining({ args: expect.arrayContaining(["order"]) }),
    );
  });

  it("writes undefined optionals as null and defaults log flags to false", async () => {
    const habitWithoutOptionals: Habit = {
      ...habit,
      targetValue: null,
      unit: undefined,
      startDate: undefined,
      order: undefined,
    };
    const booleanLogRow = {
      ...numericLogRow,
      id: "habit-1_2026-07-04",
      date: "2026-07-04",
      value: true,
      note: null,
      is_freeze: false,
      created_at: "2026-07-04T12:00:00.000Z",
    };
    const { client, queries } = createClientDouble([
      { data: habitRow, error: null },
      { data: booleanLogRow, error: null },
    ]);
    const repository = new SupabaseHabitRepository(client);

    await repository.upsertHabit(habitWithoutOptionals);
    await expect(
      repository.logValue({
        habitId: "habit-1",
        date: "2026-07-04",
        value: true,
      }),
    ).resolves.toMatchObject({ value: true });

    expect(queries[0].calls).toContainEqual({
      method: "upsert",
      args: [
        {
          ...habitRow,
          target_value: null,
          unit: null,
          start_date: null,
          sort_order: null,
        },
        { onConflict: "id" },
      ],
    });
    expect(queries[1].calls).toContainEqual({
      method: "upsert",
      args: [
        {
          id: "habit-1_2026-07-04",
          habit_id: "habit-1",
          date: "2026-07-04",
          value: true,
          note: null,
          is_grace_day: false,
          is_freeze: false,
          created_at: expect.any(String),
        },
        { onConflict: "user_id,habit_id,date" },
      ],
    });
  });

  it("returns undefined for a missing habit and surfaces errors from every call shape", async () => {
    const { client } = createClientDouble([
      { data: null, error: null },
      { data: null, error: { message: "habit list failed" } },
      { data: null, error: { message: "habit lookup failed" } },
      { data: null, error: { message: "select failed" } },
      { data: null, error: { message: "single failed" } },
      { data: null, error: { message: "habit upsert failed" } },
      { data: null, error: { message: "update failed" } },
      { data: null, error: { message: "delete failed" } },
    ]);
    const repository = new SupabaseHabitRepository(client);

    await expect(repository.getHabit("missing")).resolves.toBeUndefined();
    await expect(repository.listHabits()).rejects.toThrow("habit list failed");
    await expect(repository.getHabit("habit-1")).rejects.toThrow("habit lookup failed");
    await expect(repository.listLogs()).rejects.toThrow("select failed");
    await expect(
      repository.logValue({ habitId: "habit-1", date: "2026-07-05", value: false }),
    ).rejects.toThrow("single failed");
    await expect(repository.upsertHabit(habit)).rejects.toThrow("habit upsert failed");
    await expect(repository.archiveHabit("habit-1")).rejects.toThrow("update failed");
    await expect(repository.deleteHabit("habit-1")).rejects.toThrow("delete failed");
  });
});

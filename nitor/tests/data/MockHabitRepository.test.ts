import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSeededRepository } from "@/data/mock/MockHabitRepository";
import type { HabitRepository } from "@/data/repository";

beforeEach(() => { (globalThis as Record<string, unknown>).__NITOR_NOW__ = "2026-07-13"; });
afterEach(() => { delete (globalThis as Record<string, unknown>).__NITOR_NOW__; });

describe("MockHabitRepository", () => {
  let repo: HabitRepository;
  beforeEach(() => { repo = createSeededRepository(); });

  it("seeds several habits", async () => {
    const habits = await repo.listHabits();
    expect(habits.length).toBeGreaterThanOrEqual(4);
  });

  it("seeds multi-week logs", async () => {
    const logs = await repo.listLogs();
    expect(logs.length).toBeGreaterThan(30);
  });

  it("logValue creates or replaces a log for that habit+date", async () => {
    const [h] = await repo.listHabits();
    await repo.logValue({ habitId: h.id, date: "2026-07-13", value: true });
    const logs = await repo.listLogs(h.id);
    const todays = logs.filter((l) => l.date === "2026-07-13");
    expect(todays).toHaveLength(1);
    expect(todays[0].value).toBe(true);
  });

  it("archiveHabit hides the habit from listHabits", async () => {
    const [h] = await repo.listHabits();
    await repo.archiveHabit(h.id);
    const habits = await repo.listHabits();
    expect(habits.find((x) => x.id === h.id)).toBeUndefined();
  });
});

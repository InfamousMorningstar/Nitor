import { describe, it, expect } from "vitest";
import { csvEscape, logsToCsv } from "@/domain/csv";
import type { Habit, Log } from "@/domain/types";

describe("csvEscape", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("Read before bed")).toBe("Read before bed");
  });

  it("quotes values containing a comma", () => {
    expect(csvEscape("Gym, run")).toBe('"Gym, run"');
  });

  it("doubles internal quotes and wraps the field", () => {
    expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes values containing a newline", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("logsToCsv", () => {
  const habits: Habit[] = [
    {
      id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
      type: "boolean", targetValue: null, schedule: { kind: "daily" },
      strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
    },
  ];

  it("emits a header row followed by one row per log", () => {
    const logs: Log[] = [
      { id: "l1", habitId: "h1", date: "2026-06-01", value: true, isGraceDay: false, createdAt: "2026-06-01T08:00:00Z" },
      { id: "l2", habitId: "h1", date: "2026-06-02", value: false, isGraceDay: true, createdAt: "2026-06-02T08:00:00Z" },
      { id: "l3", habitId: "h1", date: "2026-06-03", value: false, isGraceDay: false, isFreeze: true, createdAt: "2026-06-03T08:00:00Z" },
    ];
    const csv = logsToCsv(habits, logs);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("habitId,habitName,date,value,isGraceDay,isFreeze");
    expect(lines[1]).toBe("h1,Read,2026-06-01,true,false,false");
    expect(lines[2]).toBe("h1,Read,2026-06-02,false,true,false");
    expect(lines[3]).toBe("h1,Read,2026-06-03,false,false,true");
    expect(lines).toHaveLength(4);
  });

  it("falls back to an empty name for an unknown habit id", () => {
    const logs: Log[] = [
      { id: "l1", habitId: "ghost", date: "2026-06-01", value: 3, isGraceDay: false, createdAt: "2026-06-01T08:00:00Z" },
    ];
    const csv = logsToCsv(habits, logs);
    expect(csv.split("\n")[1]).toBe("ghost,,2026-06-01,3,false,false");
  });
});

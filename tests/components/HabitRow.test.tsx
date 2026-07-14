import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitRow, scheduleLabel } from "@/components/today/HabitRow";
import { usePetStore } from "@/state/petStore";
import type { Habit } from "@/domain/types";

const habit: Habit = {
  id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
  type: "boolean", targetValue: null, schedule: { kind: "daily" },
  strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
};

beforeEach(() => {
  usePetStore.setState({ food: 0, pulse: 0 });
  // Freeze "today" so a log dated 2026-07-13 counts as today's completion.
  (globalThis as Record<string, unknown>).__NITOR_NOW__ = "2026-07-13";
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__NITOR_NOW__;
});

describe("HabitRow", () => {
  it("renders the habit name and emoji", () => {
    render(<HabitRow habit={habit} logs={[]} onLog={() => {}} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("📖")).toBeInTheDocument();
  });

  it("calls onLog(true) when a boolean habit is tapped", () => {
    const onLog = vi.fn();
    render(<HabitRow habit={habit} logs={[]} onLog={onLog} />);
    fireEvent.click(screen.getByRole("button", { name: /mark read done/i }));
    expect(onLog).toHaveBeenCalledWith(true);
  });

  it("feeds the pet once when completing a boolean habit", () => {
    render(<HabitRow habit={habit} logs={[]} onLog={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /mark read done/i }));
    expect(usePetStore.getState().food).toBe(1);
    expect(usePetStore.getState().pulse).toBe(1);
  });

  it("does not feed the pet when un-completing a habit", () => {
    render(
      <HabitRow
        habit={habit}
        logs={[{ id: "l1", habitId: "h1", date: "2026-07-13", value: true, isGraceDay: false, createdAt: "2026-07-13T00:00:00Z" }]}
        onLog={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /mark read not done/i }));
    expect(usePetStore.getState().food).toBe(0);
  });
});

describe("scheduleLabel", () => {
  it("labels daily schedules", () => {
    expect(scheduleLabel({ kind: "daily" })).toBe("Daily");
  });

  it("labels Mon-Fri weekday schedules", () => {
    expect(scheduleLabel({ kind: "weekdays", weekdays: [1, 2, 3, 4, 5] })).toBe("Mon–Fri");
  });

  it("labels sparse weekday schedules by day abbreviation", () => {
    expect(scheduleLabel({ kind: "weekdays", weekdays: [1, 3, 5] })).toBe("Mon, Wed, Fri");
  });

  it("labels timesPerWeek schedules", () => {
    expect(scheduleLabel({ kind: "timesPerWeek", timesPerWeek: 3 })).toBe("3×/week");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HabitCard } from "@/components/today/HabitCard";
import type { Habit } from "@/domain/types";

const habit: Habit = {
  id: "h1", name: "Read", emoji: "📖", color: "#7C5CFF", category: "Growth",
  type: "boolean", targetValue: null, schedule: { kind: "daily" },
  strictness: "balanced", graceDaysPerWeek: 1, archived: false, createdAt: "2026-06-01",
};

describe("HabitCard", () => {
  it("renders the habit name and emoji", () => {
    render(<HabitCard habit={habit} logs={[]} onLog={() => {}} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("📖")).toBeInTheDocument();
  });

  it("calls onLog(true) when a boolean habit is tapped", () => {
    const onLog = vi.fn();
    render(<HabitCard habit={habit} logs={[]} onLog={onLog} />);
    fireEvent.click(screen.getByRole("button", { name: /mark read/i }));
    expect(onLog).toHaveBeenCalledWith(true);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { HabitDetail } from "@/components/habits/HabitDetail";
import type { Habit } from "@/domain/types";

const habit: Habit = {
  id: "habit-1",
  name: "Read",
  emoji: "📖",
  color: "#F5B027",
  category: "Personal",
  type: "boolean",
  schedule: { kind: "daily" },
  strictness: "balanced",
  graceDaysPerWeek: 1,
  archived: false,
  createdAt: "2026-07-01",
};

describe("HabitDetail accessibility", () => {
  it("links tabs to panels and moves selection with arrow keys", () => {
    render(<HabitDetail habit={habit} logs={[]} onLog={() => {}} onSaved={() => {}} />);

    const overview = screen.getByRole("tab", { name: "Overview" });
    const edit = screen.getByRole("tab", { name: "Edit" });

    expect(overview).toHaveAttribute("aria-controls", "habit-detail-panel-overview");
    expect(overview).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "habit-detail-tab-overview");

    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });

    expect(edit).toHaveFocus();
    expect(edit).toHaveAttribute("aria-selected", "true");
    expect(edit).toHaveAttribute("tabindex", "0");
    expect(overview).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "habit-detail-panel-edit");
  });

  it("saves editable habit policy fields while preserving identity fields", () => {
    let saved: Habit | undefined;
    const existing: Habit = {
      ...habit,
      category: "Growth",
      strictness: "flexible",
      graceDaysPerWeek: 2,
      archived: true,
      startDate: "2026-07-02",
      order: 4,
    };
    render(
      <HabitDetail
        habit={existing}
        logs={[]}
        onLog={() => {}}
        onSaved={(updated) => { saved = updated; }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Category" }), {
      target: { value: "Mind" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Strict" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Grace days per week" }), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(saved).toMatchObject({
      id: "habit-1",
      createdAt: "2026-07-01",
      category: "Mind",
      strictness: "strict",
      graceDaysPerWeek: 0,
      archived: true,
      startDate: "2026-07-02",
      order: 4,
    });
  });
});

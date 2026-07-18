import { fireEvent, render, screen } from "@testing-library/react";
import { HabitForm } from "@/components/habits/HabitForm";
import type { Habit } from "@/domain/types";

describe("HabitForm advanced fields", () => {
  it("preserves the existing create defaults", () => {
    let submitted: Habit | undefined;
    render(<HabitForm onSubmit={(habit) => { submitted = habit; }} />);

    fireEvent.click(screen.getByRole("button", { name: "Add habit" }));

    expect(submitted).toMatchObject({
      category: "Personal",
      strictness: "balanced",
      graceDaysPerWeek: 1,
    });
  });

  it("submits edited category, strictness, and grace days", () => {
    let submitted: Habit | undefined;
    render(
      <HabitForm
        initial={{
          category: "Growth",
          strictness: "flexible",
          graceDaysPerWeek: 2,
        }}
        submitLabel="Save changes"
        onSubmit={(habit) => { submitted = habit; }}
      />,
    );

    const category = screen.getByRole("textbox", { name: "Category" });
    expect(category).toHaveValue("Growth");
    fireEvent.change(category, { target: { value: "Mind" } });

    expect(screen.getByRole("button", { name: "Flexible" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Strict" }));

    const graceDays = screen.getByRole("spinbutton", { name: "Grace days per week" });
    expect(graceDays).toHaveValue(2);
    fireEvent.change(graceDays, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(submitted).toMatchObject({
      category: "Mind",
      strictness: "strict",
      graceDaysPerWeek: 0,
    });
  });
});

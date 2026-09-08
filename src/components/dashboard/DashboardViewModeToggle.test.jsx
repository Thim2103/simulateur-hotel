import { render, screen, fireEvent } from "@testing-library/react";
import DashboardViewModeToggle from "./DashboardViewModeToggle";

test("marks the active view mode as pressed", () => {
  render(<DashboardViewModeToggle viewMode="expert" onChange={() => {}} />);
  expect(screen.getByRole("button", { name: "Expert" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Casual" })).toHaveAttribute("aria-pressed", "false");
});

test("clicking a mode calls onChange with its value", () => {
  const onChange = jest.fn();
  render(<DashboardViewModeToggle viewMode="casual" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Expert" }));
  expect(onChange).toHaveBeenCalledWith("expert");
});

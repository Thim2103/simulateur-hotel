import { render, screen, fireEvent } from "@testing-library/react";
import DashboardQuickActions from "./DashboardQuickActions";
import { QUICK_ACTION_CATALOG } from "../../lib/dashboard/dashboardActions";

test("lists every quick action's label and category", () => {
  render(<DashboardQuickActions quickActions={QUICK_ACTION_CATALOG} onRunAction={() => {}} isRunning={false} />);
  QUICK_ACTION_CATALOG.forEach((action) => {
    expect(screen.getByText(action.label)).toBeInTheDocument();
  });
});

test("clicking 'Appliquer' calls onRunAction with the action's id", () => {
  const onRunAction = jest.fn();
  render(<DashboardQuickActions quickActions={[QUICK_ACTION_CATALOG[0]]} onRunAction={onRunAction} isRunning={false} />);

  fireEvent.click(screen.getByRole("button", { name: /appliquer/i }));

  expect(onRunAction).toHaveBeenCalledWith(QUICK_ACTION_CATALOG[0].id);
});

test("disables every action button while running", () => {
  render(<DashboardQuickActions quickActions={QUICK_ACTION_CATALOG} onRunAction={() => {}} isRunning />);
  screen.getAllByRole("button", { name: /appliquer/i }).forEach((button) => expect(button).toBeDisabled());
});

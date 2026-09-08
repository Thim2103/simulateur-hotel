import { render, screen, fireEvent } from "@testing-library/react";
import DashboardHeader from "./DashboardHeader";

test("shows the current day and, when given, the date", () => {
  render(<DashboardHeader day={3} date="2026-09-10" onNextDay={() => {}} isRunning={false} />);
  expect(screen.getByText(/jour 3/i)).toBeInTheDocument();
  expect(screen.getByText(/2026-09-10/)).toBeInTheDocument();
});

test("labels the eyebrow for a guest session", () => {
  render(<DashboardHeader day={1} isGuest onNextDay={() => {}} isRunning={false} />);
  expect(screen.getByText(/mode invité/i)).toBeInTheDocument();
});

test("clicking 'Jouer la journée' calls onNextDay", () => {
  const onNextDay = jest.fn();
  render(<DashboardHeader day={1} onNextDay={onNextDay} isRunning={false} />);
  fireEvent.click(screen.getByRole("button", { name: /jouer la journée/i }));
  expect(onNextDay).toHaveBeenCalledTimes(1);
});

test("disables the button and shows progress while running", () => {
  render(<DashboardHeader day={1} onNextDay={() => {}} isRunning />);
  expect(screen.getByRole("button", { name: /calcul en cours/i })).toBeDisabled();
});

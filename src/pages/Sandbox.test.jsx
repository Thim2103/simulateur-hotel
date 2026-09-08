import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Sandbox from "./Sandbox";

test("shows a prompt before any day has been played", () => {
  render(<Sandbox />);
  expect(screen.getByText(/cliquez sur « jouer un jour »/i)).toBeInTheDocument();
  expect(screen.getByText(/jour 0/i)).toBeInTheDocument();
});

test("playing a day runs a real sandboxed daily cycle and shows its KPIs", async () => {
  render(<Sandbox />);

  fireEvent.click(screen.getByRole("button", { name: /jouer un jour/i }));

  await waitFor(() => expect(screen.getByText(/jour 1/i)).toBeInTheDocument());
  expect(screen.getByText("Profit du jour")).toBeInTheDocument();
  expect(screen.getByText("Chambres occupées")).toBeInTheDocument();
});

test("Recommencer resets the day counter and clears the last report", async () => {
  render(<Sandbox />);
  fireEvent.click(screen.getByRole("button", { name: /jouer un jour/i }));
  await waitFor(() => expect(screen.getByText(/jour 1/i)).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: /recommencer/i }));

  expect(screen.getByText(/jour 0/i)).toBeInTheDocument();
  expect(screen.getByText(/cliquez sur « jouer un jour »/i)).toBeInTheDocument();
});

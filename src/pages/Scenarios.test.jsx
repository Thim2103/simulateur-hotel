import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Scenarios from "./Scenarios";

test("shows the scenario's title and a Démarrer button before it starts", () => {
  render(<Scenarios />);
  expect(screen.getByRole("heading", { name: "Scénario découverte" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /démarrer le scénario/i })).toBeInTheDocument();
});

test("starting the scenario shows the day counter and a Jour suivant button", () => {
  render(<Scenarios />);
  fireEvent.click(screen.getByRole("button", { name: /démarrer le scénario/i }));

  expect(screen.getByText(/jour 0 \/ 5/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /jour suivant/i })).toBeInTheDocument();
});

test("playing a cycle runs the real Scenario Engine and shows its KPIs", async () => {
  render(<Scenarios />);
  fireEvent.click(screen.getByRole("button", { name: /démarrer le scénario/i }));
  fireEvent.click(screen.getByRole("button", { name: /jour suivant/i }));

  await waitFor(() => expect(screen.getByText(/jour 1 \/ 5/i)).toBeInTheDocument());
  expect(screen.getByText("Profit du jour")).toBeInTheDocument();
  expect(screen.getByText("Score du jour")).toBeInTheDocument();
});

test("playing every cycle finishes the run and shows a final grade", async () => {
  render(<Scenarios />);
  fireEvent.click(screen.getByRole("button", { name: /démarrer le scénario/i }));

  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- each click depends on the previous cycle's UI state.
    fireEvent.click(screen.getByRole("button", { name: /jour suivant/i }));
    // eslint-disable-next-line no-await-in-loop
    await waitFor(() => expect(screen.getByText(new RegExp(`jour ${i + 1} / 5`, "i"))).toBeInTheDocument());
  }

  expect(screen.getByText("Résultat final")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /jour suivant/i })).not.toBeInTheDocument();
});

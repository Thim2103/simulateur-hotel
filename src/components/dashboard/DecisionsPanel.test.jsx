import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DecisionsPanel from "./DecisionsPanel";

function group(overrides = {}) {
  return {
    id: "pricing",
    label: "Pricing",
    moduleLink: "/rm-dashboard",
    actions: [{ id: "increase-prices", label: "Augmenter les prix de 5 %", description: "..." }],
    ...overrides,
  };
}

test("shows a placeholder when there are no decision groups", () => {
  render(<DecisionsPanel groups={[]} onRunAction={jest.fn()} isRunning={false} />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune décision rapide/i)).toBeInTheDocument();
});

test("renders grouped actions with a module link and calls onRunAction on click", () => {
  const onRunAction = jest.fn();
  render(<DecisionsPanel groups={[group()]} onRunAction={onRunAction} isRunning={false} />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /ouvrir le module/i })).toHaveAttribute("href", "/rm-dashboard");
  fireEvent.click(screen.getByRole("button", { name: /appliquer/i }));
  expect(onRunAction).toHaveBeenCalledWith("increase-prices");
});

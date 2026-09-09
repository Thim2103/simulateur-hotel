import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GmMessageModal from "./GmMessageModal";

function message(overrides = {}) {
  return {
    id: "m1",
    type: "FINANCE_WARNING",
    title: "Trésorerie tendue",
    description: "La trésorerie du mois est négative.",
    severity: "high",
    module: "finance",
    actions: [
      { id: "reduire-couts", label: "Réduire les coûts", description: "Coupe les dépenses non essentielles." },
      { id: "relancer-ventes", label: "Relancer les ventes", description: "Lance une promotion ciblée." },
    ],
    ...overrides,
  };
}

test("renders nothing when there is no message", () => {
  const { container } = render(<GmMessageModal message={null} onClose={jest.fn()} onApply={jest.fn()} />, { wrapper: MemoryRouter });
  expect(container).toBeEmptyDOMElement();
});

test("shows the message's context, impact and decisions, and links to its module", () => {
  render(<GmMessageModal message={message()} onClose={jest.fn()} onApply={jest.fn()} />, { wrapper: MemoryRouter });

  expect(screen.getByText("La trésorerie du mois est négative.")).toBeInTheDocument();
  expect(screen.getByText(/nécessite une action rapide/i)).toBeInTheDocument();
  expect(screen.getByText("Réduire les coûts")).toBeInTheDocument();
  expect(screen.getByText("Relancer les ventes")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ouvrir le module/i })).toHaveAttribute("href", "/finance");
});

test("the Appliquer button stays disabled until a decision is selected, then calls onApply", async () => {
  const onApply = jest.fn().mockResolvedValue(null);
  render(<GmMessageModal message={message()} onClose={jest.fn()} onApply={onApply} />, { wrapper: MemoryRouter });

  const applyButton = screen.getByRole("button", { name: /^appliquer$/i });
  expect(applyButton).toBeDisabled();

  fireEvent.click(screen.getByLabelText(/réduire les coûts/i));
  expect(applyButton).toBeEnabled();

  fireEvent.click(applyButton);
  await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" }), "reduire-couts"));
  await waitFor(() => expect(screen.getByRole("button", { name: /appliqué/i })).toBeInTheDocument());
});

import { render, screen, fireEvent, within } from "@testing-library/react";
import DevelopmentPanel from "./DevelopmentPanel";
import { invest } from "../../lib/progression/positioningEngine";

const hotel = () => ({ finance: { revenue: [50000], costs: [0] }, expansion: { availableCapital: 0 } });

test("shows 'Auberge Traditionnelle' and every axis's own tiers for a hotel that never invested", () => {
  render(<DevelopmentPanel hotelState={hotel()} onInvest={jest.fn()} />);
  expect(screen.getByTestId("development-identity-title")).toHaveTextContent("Auberge Traditionnelle");
  expect(screen.getByTestId("development-axis-eco")).toHaveTextContent("Petit-déjeuner bio et local");
  expect(screen.getByTestId("development-axis-eco")).toHaveTextContent("1 500 €");
  expect(screen.getByTestId("development-axis-business")).toHaveTextContent("Connexion haut débit");
});

test("clicking 'Investir' on an available tier calls onInvest with its id", () => {
  const onInvest = jest.fn();
  render(<DevelopmentPanel hotelState={hotel()} onInvest={onInvest} />);
  const ecoAxis = screen.getByTestId("development-axis-eco");
  fireEvent.click(within(ecoAxis).getAllByRole("button", { name: "Investir" })[0]);
  expect(onInvest).toHaveBeenCalledWith("eco-breakfast");
});

test("an installed tier shows 'Installé' and its button is disabled", () => {
  let hotelState = hotel();
  hotelState = invest({ hotelState }, "eco-breakfast", { day: 1 }).hotelState;
  render(<DevelopmentPanel hotelState={hotelState} onInvest={jest.fn()} />);
  const ecoAxis = screen.getByTestId("development-axis-eco");
  expect(within(ecoAxis).getByRole("button", { name: "Installé" })).toBeDisabled();
});

test("a tier the hotel can't afford shows 'Trésorerie insuffisante' and is disabled", () => {
  const hotelState = { finance: { revenue: [0], costs: [0] }, expansion: { availableCapital: 0 } };
  render(<DevelopmentPanel hotelState={hotelState} onInvest={jest.fn()} />);
  const gastronomyAxis = screen.getByTestId("development-axis-gastronomy");
  expect(within(gastronomyAxis).getAllByRole("button", { name: "Trésorerie insuffisante" })[0]).toBeDisabled();
});

test("the identity title and target segments update once an axis is invested in", () => {
  let hotelState = hotel();
  hotelState = invest({ hotelState }, "eco-breakfast", { day: 1 }).hotelState;
  hotelState = invest({ hotelState }, "boutique-decor", { day: 1 }).hotelState;
  render(<DevelopmentPanel hotelState={hotelState} onInvest={jest.fn()} />);
  expect(screen.getByTestId("development-identity-title")).toHaveTextContent("Éco-Boutique Hôtel");
  expect(screen.getByText(/clientèle cible/i)).toHaveTextContent("Couples / Leisure");
});

test("the 'Grands chantiers' shortcut only shows when a handler is provided", () => {
  const { rerender } = render(<DevelopmentPanel hotelState={hotel()} onInvest={jest.fn()} />);
  expect(screen.queryByRole("button", { name: /grands chantiers/i })).not.toBeInTheDocument();

  const onOpenExpansion = jest.fn();
  rerender(<DevelopmentPanel hotelState={hotel()} onInvest={jest.fn()} onOpenExpansion={onOpenExpansion} />);
  fireEvent.click(screen.getByRole("button", { name: /grands chantiers/i }));
  expect(onOpenExpansion).toHaveBeenCalled();
});

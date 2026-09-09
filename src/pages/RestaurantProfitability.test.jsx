import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantProfitability from "./RestaurantProfitability";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

function restaurantState(overrides = {}) {
  return {
    profitability: {
      items: [{ id: 1, name: "Burger", marginPct: 75 }],
      grossMargin: 62,
      netMargin: 34,
      topMargin: [{ id: 2, name: "Salade", marginPct: 80 }],
      bottomMargin: [{ id: 3, name: "Tiramisu", marginPct: 37.5 }],
    },
    ...overrides,
  };
}

function restaurantHook(overrides = {}) {
  return {
    restaurantAdvancedState: null, isRunning: false, error: null,
    loadRestaurantAdvancedState: jest.fn().mockResolvedValue(null),
    applyRestaurantAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

beforeEach(() => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook());
  render(<RestaurantProfitability />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows gross/net margin KPIs and top/bottom performers", () => {
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantProfitability />, { wrapper: MemoryRouter });

  expect(screen.getByText("62%")).toBeInTheDocument();
  expect(screen.getByText("34%")).toBeInTheDocument();
  expect(screen.getByText("Salade")).toBeInTheDocument();
  expect(screen.getByText("Tiramisu")).toBeInTheDocument();
});

test("clicking 'Repositionner les prix' calls applyRestaurantAction", () => {
  const applyRestaurantAction = jest.fn().mockResolvedValue(null);
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState(), applyRestaurantAction }));
  render(<RestaurantProfitability />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /repositionner les prix/i }));
  expect(applyRestaurantAction).toHaveBeenCalledWith("repositionner-prix");
});

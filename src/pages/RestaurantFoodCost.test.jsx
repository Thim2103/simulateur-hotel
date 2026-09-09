import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantFoodCost from "./RestaurantFoodCost";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

function restaurantState(overrides = {}) {
  return {
    foodCost: { overall: 34, byCategory: { Plat: 25, Dessert: 62 }, wastePct: 20, volatilityIndex: 15 },
    menuEngineering: { items: [{ id: 3, name: "Tiramisu", category: "Dessert" }], counts: {} },
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
  render(<RestaurantFoodCost />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows food cost KPIs and category breakdown", () => {
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantFoodCost />, { wrapper: MemoryRouter });

  expect(screen.getByText("34%")).toBeInTheDocument();
  expect(screen.getByText("Tiramisu (Dessert)")).toBeInTheDocument();
});

test("clicking 'Réduire les pertes' calls applyRestaurantAction", () => {
  const applyRestaurantAction = jest.fn().mockResolvedValue(null);
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState(), applyRestaurantAction }));
  render(<RestaurantFoodCost />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /réduire les pertes/i }));
  expect(applyRestaurantAction).toHaveBeenCalledWith("reduire-pertes");
});

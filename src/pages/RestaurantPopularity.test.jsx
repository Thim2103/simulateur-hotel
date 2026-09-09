import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantPopularity from "./RestaurantPopularity";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

function restaurantState(overrides = {}) {
  return {
    popularity: {
      items: [
        { id: 1, name: "Burger", popularity: 90, trend: "up" },
        { id: 2, name: "Soupe", popularity: 20, trend: "down" },
      ],
      trending: [1],
      declining: [2],
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
  render(<RestaurantPopularity />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows trending and declining dishes", () => {
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantPopularity />, { wrapper: MemoryRouter });

  expect(screen.getByText("Burger — 90/100")).toBeInTheDocument();
  expect(screen.getByText("Soupe — 20/100")).toBeInTheDocument();
});

test("clicking 'Campagne plats signature' calls applyRestaurantAction", () => {
  const applyRestaurantAction = jest.fn().mockResolvedValue(null);
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState(), applyRestaurantAction }));
  render(<RestaurantPopularity />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /campagne plats signature/i }));
  expect(applyRestaurantAction).toHaveBeenCalledWith("campagne-plats-signature");
});

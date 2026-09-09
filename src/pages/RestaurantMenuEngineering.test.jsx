import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantMenuEngineering from "./RestaurantMenuEngineering";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

function careerState(overrides = {}) {
  return { day: 5, status: "active", hotel: { hotelState: {}, restaurantState: {} }, missions: [], objectives: [], rewardsInbox: [], ...overrides };
}

function restaurantState(overrides = {}) {
  return {
    foodCost: { overall: 28, byCategory: {}, wastePct: 20, volatilityIndex: 15 },
    popularity: { items: [], trending: [], declining: [] },
    profitability: { items: [], grossMargin: 62, netMargin: 34, topMargin: [], bottomMargin: [] },
    menuEngineering: {
      items: [{ id: 1, name: "Burger", category: "Plat", popularityIndex: 1.5, profitabilityIndex: 1.3, quadrant: "star" }],
      counts: { stars: 1, plowhorses: 0, puzzles: 0, dogs: 0 },
    },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne rentabilité globale." }],
    forecast: { scenarios: { realiste: { days: [{ day: 1, foodCost: 28 }] } } },
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return { careerState: null, isRunning: false, error: null, startCareer: jest.fn().mockResolvedValue(careerState()), ...overrides };
}

function restaurantHook(overrides = {}) {
  return {
    restaurantAdvancedState: null, isRunning: false, error: null,
    loadRestaurantAdvancedState: jest.fn().mockResolvedValue(null),
    applyRestaurantAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the restaurant advanced state on mount", () => {
  const loadRestaurantAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ loadRestaurantAdvancedState }));
  render(<RestaurantMenuEngineering />, { wrapper: MemoryRouter });
  expect(loadRestaurantAdvancedState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useRestaurantAdvanced.mockReturnValue(restaurantHook());
  render(<RestaurantMenuEngineering />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows menu engineering counts, items table and diagnostics once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantMenuEngineering />, { wrapper: MemoryRouter });

  expect(screen.getByText("Burger")).toBeInTheDocument();
  expect(screen.getByText("Bonne rentabilité globale.")).toBeInTheDocument();
});

test("clicking an action's 'Appliquer' calls applyRestaurantAction", () => {
  const applyRestaurantAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState(), applyRestaurantAction }));
  render(<RestaurantMenuEngineering />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyRestaurantAction).toHaveBeenCalledWith("optimiser-carte");
});

test("links to food-cost, popularity, profitability, forecast and report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantMenuEngineering />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /food cost/i })).toHaveAttribute("href", "/restaurant/food-cost");
  expect(screen.getByRole("link", { name: /popularité/i })).toHaveAttribute("href", "/restaurant/popularity");
  expect(screen.getByRole("link", { name: /rentabilité/i })).toHaveAttribute("href", "/restaurant/profitability");
  expect(screen.getByRole("link", { name: /forecast/i })).toHaveAttribute("href", "/restaurant/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/restaurant/report");
});

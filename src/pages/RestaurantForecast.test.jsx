import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantForecast from "./RestaurantForecast";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

// Chart.js needs a real canvas context, which jsdom doesn't provide; these
// tests only care about the surrounding text/DOM, not the rendered canvas.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function forecast() {
  return {
    horizonDays: 30,
    generatedAt: new Date().toISOString(),
    scenarios: {
      optimiste: { avgFoodCost: 26, avgGrossMargin: 68, endFoodCost: 24, endGrossMargin: 70, endPopularity: 80, days: [{ day: 1, foodCost: 26, grossMargin: 68 }] },
      realiste: { avgFoodCost: 29, avgGrossMargin: 62, endFoodCost: 30, endGrossMargin: 62, endPopularity: 65, days: [{ day: 1, foodCost: 30, grossMargin: 62 }] },
      pessimiste: { avgFoodCost: 34, avgGrossMargin: 55, endFoodCost: 36, endGrossMargin: 52, endPopularity: 50, days: [{ day: 1, foodCost: 36, grossMargin: 52 }] },
    },
  };
}

function restaurantState(overrides = {}) {
  return { foodCost: { overall: 30 }, profitability: { grossMargin: 62 }, forecast: forecast(), ...overrides };
}

function restaurantHook(overrides = {}) {
  return {
    restaurantAdvancedState: null, isRunning: false, error: null,
    loadRestaurantAdvancedState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the restaurant advanced state on mount", () => {
  const loadRestaurantAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ loadRestaurantAdvancedState }));
  render(<RestaurantForecast />, { wrapper: MemoryRouter });
  expect(loadRestaurantAdvancedState).toHaveBeenCalled();
});

test("prompts to play a cycle when no forecast yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState({ forecast: null }) }));
  render(<RestaurantForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows réaliste scenario KPIs by default", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText("30%")).toBeInTheDocument(); // endFoodCost réaliste
  expect(screen.getByText("29%")).toBeInTheDocument(); // avgFoodCost réaliste
});

test("switching to optimiste tab shows optimiste KPIs", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook({ restaurantAdvancedState: restaurantState() }));
  render(<RestaurantForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: /optimiste/i }));
  expect(screen.getByText("24%")).toBeInTheDocument(); // endFoodCost optimiste
});

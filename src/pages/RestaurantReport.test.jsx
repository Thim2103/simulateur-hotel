import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantReport from "./RestaurantReport";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRestaurantAdvanced");

function restaurantState(overrides = {}) {
  return {
    period: "2026-09-16",
    foodCost: { overall: 28, wastePct: 20 },
    profitability: { grossMargin: 62, netMargin: 34 },
    menuEngineering: { counts: { stars: 2, plowhorses: 1, puzzles: 1, dogs: 0 } },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne rentabilité globale." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-16", foodCost: 28, grossMargin: 62 }] },
    forecast: { horizonDays: 30, generatedAt: new Date().toISOString(), scenarios: {} },
    cyclesElapsed: 1,
    ...overrides,
  };
}

function restaurantHook(stateValue = null, overrides = {}) {
  const report = stateValue
    ? {
        period: stateValue.period,
        generatedAt: new Date().toISOString(),
        foodCost: stateValue.foodCost,
        profitability: stateValue.profitability,
        menuEngineering: stateValue.menuEngineering,
        diagnostics: stateValue.diagnostics,
        forecast: stateValue.forecast,
        replay: { totalCycles: 1, entries: stateValue.replayLog.entries },
      }
    : null;

  return {
    restaurantAdvancedState: stateValue,
    isRunning: false,
    error: null,
    loadRestaurantAdvancedState: jest.fn().mockResolvedValue(null),
    getRestaurantAdvancedReport: jest.fn().mockReturnValue(report),
    ...overrides,
  };
}

test("loads the restaurant advanced state on mount", () => {
  const loadRestaurantAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook(null, { loadRestaurantAdvancedState }));
  render(<RestaurantReport />, { wrapper: MemoryRouter });
  expect(loadRestaurantAdvancedState).toHaveBeenCalled();
});

test("prompts to play a cycle when no report yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook(null));
  render(<RestaurantReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows food cost/margin KPIs, menu engineering and diagnostics", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook(restaurantState()));
  render(<RestaurantReport />, { wrapper: MemoryRouter });

  expect(screen.getAllByText("28%").length).toBeGreaterThanOrEqual(1); // food cost
  expect(screen.getAllByText("62%").length).toBeGreaterThanOrEqual(1); // gross margin
  expect(screen.getByText("Bonne rentabilité globale.")).toBeInTheDocument();
});

test("shows replay table with one entry", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRestaurantAdvanced.mockReturnValue(restaurantHook(restaurantState()));
  render(<RestaurantReport />, { wrapper: MemoryRouter });

  expect(screen.getByText("Replay (1 cycles)")).toBeInTheDocument();
  expect(screen.getByText("2026-09-16")).toBeInTheDocument();
});

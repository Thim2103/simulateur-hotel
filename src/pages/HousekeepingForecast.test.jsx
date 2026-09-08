import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HousekeepingForecast from "./HousekeepingForecast";
import { useHousekeepingEngine } from "../hooks/useHousekeepingEngine";

jest.mock("../hooks/useHousekeepingEngine");

function scenario({ avgOverload, endOverload, endQuality, avgQuality = 60 }) {
  return {
    days: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, overload: endOverload, quality: endQuality })),
    avgOverload,
    avgQuality,
    endOverload,
    endQuality,
  };
}

function forecast() {
  return {
    horizonDays: 30,
    scenarios: {
      optimiste: scenario({ avgOverload: 60, endOverload: 50, endQuality: 80 }),
      realiste: scenario({ avgOverload: 90, endOverload: 90, endQuality: 65 }),
      pessimiste: scenario({ avgOverload: 130, endOverload: 140, endQuality: 40 }),
    },
  };
}

function hkHook(overrides = {}) {
  return {
    housekeepingState: null,
    isRunning: false,
    error: null,
    loadHousekeepingState: jest.fn().mockResolvedValue(null),
    getHousekeepingForecast: jest.fn(() => null),
    ...overrides,
  };
}

test("loads the housekeeping state on mount", () => {
  const loadHousekeepingState = jest.fn().mockResolvedValue(null);
  useHousekeepingEngine.mockReturnValue(hkHook({ loadHousekeepingState }));
  render(<HousekeepingForecast />, { wrapper: MemoryRouter });
  expect(loadHousekeepingState).toHaveBeenCalled();
});

test("shows a placeholder before any forecast exists", () => {
  useHousekeepingEngine.mockReturnValue(hkHook());
  render(<HousekeepingForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows the 'réaliste' scenario by default", () => {
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: {}, getHousekeepingForecast: () => forecast() }));
  render(<HousekeepingForecast />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tab", { name: "Réaliste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("65/100")).toBeInTheDocument(); // endQuality for réaliste
});

test("switching scenarios updates the KPIs shown", () => {
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: {}, getHousekeepingForecast: () => forecast() }));
  render(<HousekeepingForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: "Pessimiste" }));

  expect(screen.getByRole("tab", { name: "Pessimiste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("40/100")).toBeInTheDocument();
});

test("shows a scenario comparison across the three scenarios", () => {
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: {}, getHousekeepingForecast: () => forecast() }));
  render(<HousekeepingForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText(/qualité finale : 80\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/qualité finale : 65\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/qualité finale : 40\/100/i)).toBeInTheDocument();
});

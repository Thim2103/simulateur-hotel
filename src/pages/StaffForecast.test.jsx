import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffForecast from "./StaffForecast";
import { useStaffEngine } from "../hooks/useStaffEngine";

jest.mock("../hooks/useStaffEngine");

function scenario({ avgMorale, endOverload, avgAbsenteeism = 10 }) {
  return {
    days: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, morale: avgMorale, absenteeism: avgAbsenteeism, overload: endOverload, productivity: 70, turnoverRate: 5 })),
    avgMorale,
    avgAbsenteeism,
    avgOverload: endOverload,
    endOverload,
    endTurnoverRate: 5,
  };
}

function forecast() {
  return {
    horizonDays: 30,
    scenarios: {
      optimiste: scenario({ avgMorale: 80, endOverload: 70 }),
      realiste: scenario({ avgMorale: 65, endOverload: 90 }),
      pessimiste: scenario({ avgMorale: 45, endOverload: 130 }),
    },
  };
}

function staffHook(overrides = {}) {
  return {
    staffState: null,
    isRunning: false,
    error: null,
    loadStaffState: jest.fn().mockResolvedValue(null),
    getStaffForecast: jest.fn(() => null),
    ...overrides,
  };
}

test("loads the staff state on mount", () => {
  const loadStaffState = jest.fn().mockResolvedValue(null);
  useStaffEngine.mockReturnValue(staffHook({ loadStaffState }));
  render(<StaffForecast />, { wrapper: MemoryRouter });
  expect(loadStaffState).toHaveBeenCalled();
});

test("shows a placeholder before any forecast exists", () => {
  useStaffEngine.mockReturnValue(staffHook());
  render(<StaffForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows the 'réaliste' scenario by default", () => {
  useStaffEngine.mockReturnValue(staffHook({ staffState: {}, getStaffForecast: () => forecast() }));
  render(<StaffForecast />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tab", { name: "Réaliste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("65/100")).toBeInTheDocument(); // avgMorale for réaliste
});

test("switching scenarios updates the KPIs shown", () => {
  useStaffEngine.mockReturnValue(staffHook({ staffState: {}, getStaffForecast: () => forecast() }));
  render(<StaffForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: "Pessimiste" }));

  expect(screen.getByRole("tab", { name: "Pessimiste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("45/100")).toBeInTheDocument(); // avgMorale for pessimiste
});

test("shows a scenario comparison across the three scenarios", () => {
  useStaffEngine.mockReturnValue(staffHook({ staffState: {}, getStaffForecast: () => forecast() }));
  render(<StaffForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText(/moral moyen : 80\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/moral moyen : 65\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/moral moyen : 45\/100/i)).toBeInTheDocument();
});

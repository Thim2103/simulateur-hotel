import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffReport from "./StaffReport";
import { useStaffEngine } from "../hooks/useStaffEngine";

jest.mock("../hooks/useStaffEngine");

function staffState(overrides = {}) {
  return {
    period: "2026-09-10",
    headcount: { hotel: 10, restaurant: 6, total: 16 },
    morale: 72,
    productivity: 78,
    absenteeism: 8,
    overload: 85,
    housekeepingLoad: 90,
    serviceLoad: 70,
    turnover: { estimatedRate: 5, actualRateLastCycle: 0, departuresLast: 0 },
    payroll: { hotel: 38000, restaurant: 9800, total: 47800 },
    diagnostics: [{ type: "error", severity: "high", message: "Moral critique." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-09", headcount: { total: 15 }, morale: 65, overload: 80, productivity: 70, absenteeism: 10, turnover: { estimatedRate: 6 } }] },
    forecast: null,
    ...overrides,
  };
}

function staffHook(overrides = {}) {
  return {
    staffState: null,
    isRunning: false,
    error: null,
    loadStaffState: jest.fn().mockResolvedValue(null),
    getStaffReport: jest.fn(() => ({
      period: null,
      headcount: null,
      morale: null,
      productivity: null,
      absenteeism: null,
      overload: null,
      housekeepingLoad: null,
      serviceLoad: null,
      turnover: null,
      payroll: null,
      diagnostics: [],
      forecast: null,
      replay: { totalCycles: 0, entries: [] },
    })),
    ...overrides,
  };
}

test("loads the staff state on mount", () => {
  const loadStaffState = jest.fn().mockResolvedValue(null);
  useStaffEngine.mockReturnValue(staffHook({ loadStaffState }));
  render(<StaffReport />, { wrapper: MemoryRouter });
  expect(loadStaffState).toHaveBeenCalled();
});

test("shows a placeholder before any HR cycle exists", () => {
  useStaffEngine.mockReturnValue(staffHook());
  render(<StaffReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée rh/i)).toBeInTheDocument();
});

test("shows the headcount, workload and payroll sections once loaded", () => {
  const state = staffState();
  useStaffEngine.mockReturnValue(
    staffHook({
      staffState: state,
      getStaffReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<StaffReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/Effectif total : 16/)).toBeInTheDocument();
  expect(screen.getByText(/Surcharge : 85%/)).toBeInTheDocument();
  expect(screen.getByText(/Masse salariale totale : 47 800 €/)).toBeInTheDocument();
  expect(screen.getByText("Moral critique.")).toBeInTheDocument();
});

test("shows the HR replay log and lets you inspect a past cycle", () => {
  const state = staffState();
  useStaffEngine.mockReturnValue(
    staffHook({
      staffState: state,
      getStaffReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<StaffReport />, { wrapper: MemoryRouter });

  const cycleButton = screen.getByRole("button", { name: /cycle 1/i });
  expect(cycleButton).toBeInTheDocument();
  fireEvent.click(cycleButton);
  expect(screen.getByText(/effectif 15/i)).toBeInTheDocument();
});

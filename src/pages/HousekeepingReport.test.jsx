import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HousekeepingReport from "./HousekeepingReport";
import { useHousekeepingEngine } from "../hooks/useHousekeepingEngine";

jest.mock("../hooks/useHousekeepingEngine");

function housekeepingState(overrides = {}) {
  return {
    period: "2026-09-10",
    workload: { roomsToClean: 6, priorities: { arrivals: 2, departures: 4, stayovers: 3 } },
    cleaningTime: { totalMinutes: 240, minutesPerRoom: 30 },
    productivity: 68,
    overload: 72,
    understaffing: { understaffed: true, shortfall: 3 },
    quality: 74,
    housekeeperCount: 3,
    cost: 7800,
    diagnostics: [{ type: "error", severity: "high", message: "Sous-effectif housekeeping." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-09", roomsToClean: 5, overload: 60, quality: 70, productivity: 65 }] },
    forecast: null,
    ...overrides,
  };
}

function hkHook(overrides = {}) {
  return {
    housekeepingState: null,
    isRunning: false,
    error: null,
    loadHousekeepingState: jest.fn().mockResolvedValue(null),
    getHousekeepingReport: jest.fn(() => ({
      period: null,
      workload: { roomsToClean: 0, priorities: {} },
      cleaningTime: { totalMinutes: 0, minutesPerRoom: 0 },
      productivity: 0,
      overload: 0,
      understaffing: { understaffed: false, shortfall: 0 },
      quality: 0,
      housekeeperCount: 0,
      cost: 0,
      diagnostics: [],
      forecast: null,
      replay: { totalCycles: 0, entries: [] },
    })),
    ...overrides,
  };
}

test("loads the housekeeping state on mount", () => {
  const loadHousekeepingState = jest.fn().mockResolvedValue(null);
  useHousekeepingEngine.mockReturnValue(hkHook({ loadHousekeepingState }));
  render(<HousekeepingReport />, { wrapper: MemoryRouter });
  expect(loadHousekeepingState).toHaveBeenCalled();
});

test("shows a placeholder before any HK cycle exists", () => {
  useHousekeepingEngine.mockReturnValue(hkHook());
  render(<HousekeepingReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée housekeeping/i)).toBeInTheDocument();
});

test("shows the workload, staffing and quality sections once loaded", () => {
  const state = housekeepingState();
  useHousekeepingEngine.mockReturnValue(
    hkHook({
      housekeepingState: state,
      getHousekeepingReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<HousekeepingReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/Chambres à nettoyer : 6/)).toBeInTheDocument();
  expect(screen.getByText(/Surcharge : 72%/)).toBeInTheDocument();
  expect(screen.getByText(/oui \(-3 chambres\)/)).toBeInTheDocument();
  expect(screen.getByText("Sous-effectif housekeeping.")).toBeInTheDocument();
});

test("shows the HK replay log and lets you inspect a past cycle", () => {
  const state = housekeepingState();
  useHousekeepingEngine.mockReturnValue(
    hkHook({
      housekeepingState: state,
      getHousekeepingReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<HousekeepingReport />, { wrapper: MemoryRouter });

  const cycleButton = screen.getByRole("button", { name: /cycle 1/i });
  expect(cycleButton).toBeInTheDocument();
  fireEvent.click(cycleButton);
  expect(screen.getByText(/productivité 65\/100/i)).toBeInTheDocument();
});

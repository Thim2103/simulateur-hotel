import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsReport from "./ClientsReport";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");

function clientsState(overrides = {}) {
  return {
    period: "2026-09-16",
    satisfaction: 72,
    loyalty: 63,
    reviews: { avgRating: 4.0, count: 18, positive: 78, negative: 10, trend: "stable" },
    complaints: [],
    segments: { business: 28, leisure: 42, famille: 18, premium: 12 },
    behaviors: { avgSpend: 195, returnRate: 48, preferredSegment: "leisure" },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne fidélité client." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-16", satisfaction: 72, loyalty: 63, avgRating: 4.0 }] },
    forecast: { horizonDays: 30, generatedAt: new Date().toISOString(), scenarios: {} },
    cyclesElapsed: 1,
    ...overrides,
  };
}

function clientsHook(clientsStateValue = null, overrides = {}) {
  const report = clientsStateValue
    ? {
        period: clientsStateValue.period,
        generatedAt: new Date().toISOString(),
        segments: clientsStateValue.segments,
        satisfaction: clientsStateValue.satisfaction,
        loyalty: clientsStateValue.loyalty,
        reviews: clientsStateValue.reviews,
        complaints: clientsStateValue.complaints,
        behaviors: clientsStateValue.behaviors,
        diagnostics: clientsStateValue.diagnostics,
        forecast: clientsStateValue.forecast,
        replay: { totalCycles: 1, entries: clientsStateValue.replayLog.entries },
      }
    : null;

  return {
    clientsState: clientsStateValue,
    isRunning: false,
    error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    getClientsReport: jest.fn().mockReturnValue(report),
    ...overrides,
  };
}

test("loads the clients state on mount", () => {
  const loadClientsState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook(null, { loadClientsState }));
  render(<ClientsReport />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to play a cycle when no report yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook(null));
  render(<ClientsReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows satisfaction/loyalty KPIs, segments and diagnostics", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook(clientsState()));
  render(<ClientsReport />, { wrapper: MemoryRouter });

  // "72/100" appears in both the KpiCard and the replay table row
  expect(screen.getAllByText("72/100").length).toBeGreaterThanOrEqual(1); // satisfaction
  expect(screen.getAllByText("63/100").length).toBeGreaterThanOrEqual(1); // loyalty
  expect(screen.getAllByText("4.0/5").length).toBeGreaterThanOrEqual(1); // rating
  expect(screen.getByText("Bonne fidélité client.")).toBeInTheDocument();
});

test("shows replay table with one entry", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook(clientsState()));
  render(<ClientsReport />, { wrapper: MemoryRouter });

  expect(screen.getByText("Replay (1 cycles)")).toBeInTheDocument();
  expect(screen.getByText("2026-09-16")).toBeInTheDocument(); // period in table
});

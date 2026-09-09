import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmAdvancedReport from "./RmAdvancedReport";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

function rmAdvancedState(overrides = {}) {
  return {
    period: "2026-09-16",
    compression: { avgCompression: 68, highCompressionDates: [] },
    displacement: { totalLoss: 120 },
    otaStrategy: { otaShare: 35, directShare: 45 },
    specialPricing: { corporateRate: 100, premiumRate: 150, longStayRate: 90, eventRate: 130 },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne performance RM." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-16", avgCompression: 68, otaShare: 35 }] },
    forecast: { horizonDays: 30, generatedAt: new Date().toISOString(), scenarios: {} },
    cyclesElapsed: 1,
    ...overrides,
  };
}

function rmHook(stateValue = null, overrides = {}) {
  const report = stateValue
    ? {
        period: stateValue.period,
        generatedAt: new Date().toISOString(),
        compression: stateValue.compression,
        displacement: stateValue.displacement,
        otaStrategy: stateValue.otaStrategy,
        specialPricing: stateValue.specialPricing,
        diagnostics: stateValue.diagnostics,
        forecast: stateValue.forecast,
        replay: { totalCycles: 1, entries: stateValue.replayLog.entries },
      }
    : null;

  return {
    rmAdvancedState: stateValue,
    isRunning: false,
    error: null,
    loadRmAdvancedState: jest.fn().mockResolvedValue(null),
    getRmAdvancedReport: jest.fn().mockReturnValue(report),
    ...overrides,
  };
}

test("loads the RM Advanced state on mount", () => {
  const loadRmAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook(null, { loadRmAdvancedState }));
  render(<RmAdvancedReport />, { wrapper: MemoryRouter });
  expect(loadRmAdvancedState).toHaveBeenCalled();
});

test("prompts to play a cycle when no report yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook(null));
  render(<RmAdvancedReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows compression/displacement/OTA KPIs, special pricing and diagnostics", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook(rmAdvancedState()));
  render(<RmAdvancedReport />, { wrapper: MemoryRouter });

  expect(screen.getAllByText("68%").length).toBeGreaterThanOrEqual(1); // compression
  expect(screen.getByText("120 €")).toBeInTheDocument(); // displacement
  expect(screen.getByText("Bonne performance RM.")).toBeInTheDocument();
});

test("shows replay table with one entry", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook(rmAdvancedState()));
  render(<RmAdvancedReport />, { wrapper: MemoryRouter });

  expect(screen.getByText("Replay (1 cycles)")).toBeInTheDocument();
  expect(screen.getByText("2026-09-16")).toBeInTheDocument();
});

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EsgReport from "./EsgReport";
import { useEsgEngine } from "../hooks/useEsgEngine";

jest.mock("../hooks/useEsgEngine");

function esgState(overrides = {}) {
  return {
    period: "2026-09-10",
    energy: 320,
    water: 12.5,
    waste: 45,
    co2: 210,
    costs: { energy: 70, water: 56, waste: 8, total: 134 },
    score: 62,
    certifications: [{ id: "green-key", name: "Green Key", obtained: true, progress: 100 }],
    diagnostics: [{ type: "error", severity: "high", message: "Score ESG critique." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-09", energy: 300, water: 10, waste: 40, co2: 200, score: 58 }] },
    forecast: null,
    ...overrides,
  };
}

function esgHook(overrides = {}) {
  return {
    esgState: null,
    isRunning: false,
    error: null,
    loadEsgState: jest.fn().mockResolvedValue(null),
    getEsgReport: jest.fn(() => ({
      period: null,
      energy: 0,
      water: 0,
      waste: 0,
      co2: 0,
      costs: { energy: 0, water: 0, waste: 0, total: 0 },
      score: 0,
      certifications: [],
      diagnostics: [],
      forecast: null,
      replay: { totalCycles: 0, entries: [] },
    })),
    ...overrides,
  };
}

test("loads the ESG state on mount", () => {
  const loadEsgState = jest.fn().mockResolvedValue(null);
  useEsgEngine.mockReturnValue(esgHook({ loadEsgState }));
  render(<EsgReport />, { wrapper: MemoryRouter });
  expect(loadEsgState).toHaveBeenCalled();
});

test("shows a placeholder before any ESG cycle exists", () => {
  useEsgEngine.mockReturnValue(esgHook());
  render(<EsgReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée esg/i)).toBeInTheDocument();
});

test("shows the consumption, costs and certifications sections once loaded", () => {
  const state = esgState();
  useEsgEngine.mockReturnValue(
    esgHook({
      esgState: state,
      getEsgReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<EsgReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/CO₂ : 210 kg/)).toBeInTheDocument();
  expect(screen.getByText(/Coût total : 134 €/)).toBeInTheDocument();
  expect(screen.getByText("Green Key")).toBeInTheDocument();
  expect(screen.getByText("Score ESG critique.")).toBeInTheDocument();
});

test("shows the ESG replay log and lets you inspect a past cycle", () => {
  const state = esgState();
  useEsgEngine.mockReturnValue(
    esgHook({
      esgState: state,
      getEsgReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<EsgReport />, { wrapper: MemoryRouter });

  const cycleButton = screen.getByRole("button", { name: /cycle 1/i });
  expect(cycleButton).toBeInTheDocument();
  fireEvent.click(cycleButton);
  expect(screen.getByText(/eau 10 m³/i)).toBeInTheDocument();
});

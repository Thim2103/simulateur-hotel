import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketingReport from "./MarketingReport";
import { useMarketingEngine } from "../hooks/useMarketingEngine";

jest.mock("../hooks/useMarketingEngine");

function marketingState(overrides = {}) {
  return {
    period: "2026-09-10",
    budget: { channel: 4000, campaign: 3000, total: 7000 },
    roi: { overallRoi: 2.1, generatedRevenue: 14700 },
    conversion: { totalReach: 200, estimatedLeads: 120, conversionRate: 15 },
    reputation: 72,
    positioningTier: "upscale",
    segments: { counts: { business: 3, leisure: 5, famille: 2, premium: 1 } },
    crossSelling: 22.5,
    diagnostics: [{ type: "error", severity: "high", message: "ROI marketing négatif." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-09", budget: { total: 6500 }, roi: { overallRoi: 1.8 }, conversion: { conversionRate: 12 }, reputation: 65, positioningTier: "midscale" }] },
    forecast: null,
    ...overrides,
  };
}

function marketingHook(overrides = {}) {
  return {
    marketingState: null,
    isRunning: false,
    error: null,
    loadMarketingState: jest.fn().mockResolvedValue(null),
    getMarketingReport: jest.fn(() => ({
      period: null,
      budget: { channel: 0, campaign: 0, total: 0 },
      roi: { overallRoi: 0, generatedRevenue: 0 },
      conversion: { totalReach: 0, estimatedLeads: 0, conversionRate: 0 },
      reputation: 0,
      positioningTier: null,
      segments: { counts: {} },
      crossSelling: 0,
      diagnostics: [],
      forecast: null,
      replay: { totalCycles: 0, entries: [] },
    })),
    ...overrides,
  };
}

test("loads the marketing state on mount", () => {
  const loadMarketingState = jest.fn().mockResolvedValue(null);
  useMarketingEngine.mockReturnValue(marketingHook({ loadMarketingState }));
  render(<MarketingReport />, { wrapper: MemoryRouter });
  expect(loadMarketingState).toHaveBeenCalled();
});

test("shows a placeholder before any marketing cycle exists", () => {
  useMarketingEngine.mockReturnValue(marketingHook());
  render(<MarketingReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée marketing/i)).toBeInTheDocument();
});

test("shows the budget, conversion and segments sections once loaded", () => {
  const state = marketingState();
  useMarketingEngine.mockReturnValue(
    marketingHook({
      marketingState: state,
      getMarketingReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<MarketingReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/Budget total : 7 000 €/)).toBeInTheDocument();
  expect(screen.getByText(/Taux de conversion : 15%/)).toBeInTheDocument();
  expect(screen.getByText(/Cross-selling restaurant : 22.5%/)).toBeInTheDocument();
  expect(screen.getByText("ROI marketing négatif.")).toBeInTheDocument();
});

test("shows the marketing replay log and lets you inspect a past cycle", () => {
  const state = marketingState();
  useMarketingEngine.mockReturnValue(
    marketingHook({
      marketingState: state,
      getMarketingReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<MarketingReport />, { wrapper: MemoryRouter });

  const cycleButton = screen.getByRole("button", { name: /cycle 1/i });
  expect(cycleButton).toBeInTheDocument();
  fireEvent.click(cycleButton);
  expect(screen.getByText(/conversion 12%/i)).toBeInTheDocument();
});

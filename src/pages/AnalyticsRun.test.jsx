import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AnalyticsRun from "./AnalyticsRun";
import { useAnalytics } from "../hooks/useAnalytics";

jest.mock("../hooks/useAnalytics");

function renderAtRun(runId = "academie-c1-g1") {
  return render(
    <MemoryRouter initialEntries={[`/analytics/${runId}`]}>
      <Routes>
        <Route path="/analytics/:runId" element={<AnalyticsRun />} />
      </Routes>
    </MemoryRouter>
  );
}

function analysis(overrides = {}) {
  return {
    runId: "academie-c1-g1",
    ownerLabel: "Groupe A",
    source: "academie",
    kpis: { profit: { count: 2, average: 700, trend: "increasing" } },
    decisions: { fields: [{ field: "pricingADR", timesSet: 2, averageSwing: 15 }] },
    events: { impact: [{ eventId: "rush", occurrences: 1, averageScoreDelta: -5 }] },
    diagnostics: [{ type: "error", severity: "high", message: "Objectif non atteint" }],
    recommendations: [{ text: "Corriger en priorité : Objectif non atteint" }],
    ...overrides,
  };
}

function baseHook(overrides = {}) {
  const analyticsState = overrides.analyticsState || { analysesById: { "academie-c1-g1": analysis() } };
  return {
    analyticsState,
    isRunning: false,
    error: null,
    analyzeRun: jest.fn().mockResolvedValue(analysis()),
    ...overrides,
  };
}

test("analyzes the routed runId on mount", () => {
  const analyzeRun = jest.fn().mockResolvedValue(analysis());
  useAnalytics.mockReturnValue(baseHook({ analyzeRun, analyticsState: { analysesById: {} } }));
  renderAtRun("academie-c1-g1");
  expect(analyzeRun).toHaveBeenCalledWith("academie-c1-g1");
});

test("shows KPIs, decisions, events, diagnostics and recommendations", () => {
  useAnalytics.mockReturnValue(baseHook());
  renderAtRun();

  expect(screen.getByText("Groupe A")).toBeInTheDocument();
  expect(screen.getByText("pricingADR")).toBeInTheDocument();
  expect(screen.getByText("rush")).toBeInTheDocument();
  expect(screen.getAllByText(/objectif non atteint/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/corriger en priorité/i)).toBeInTheDocument();
});

test("shows a loading state before the analysis resolves", () => {
  useAnalytics.mockReturnValue(baseHook({ isRunning: true, analyticsState: { analysesById: {} } }));
  renderAtRun();
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows an error banner when the analysis fails", () => {
  useAnalytics.mockReturnValue(baseHook({ error: new Error("Replay introuvable"), analyticsState: { analysesById: {} } }));
  renderAtRun();
  expect(screen.getByText(/replay introuvable/i)).toBeInTheDocument();
});

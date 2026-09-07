import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AnalyticsReport from "./AnalyticsReport";
import { useAnalytics } from "../hooks/useAnalytics";

jest.mock("../hooks/useAnalytics");

function renderAtReport() {
  return render(
    <MemoryRouter initialEntries={["/analytics/academie-c1-g1/report"]}>
      <Routes>
        <Route path="/analytics/:runId/report" element={<AnalyticsReport />} />
      </Routes>
    </MemoryRouter>
  );
}

function report() {
  return {
    runId: "academie-c1-g1",
    ownerLabel: "Groupe A",
    source: "academie",
    finalScore: 70,
    kpiSummary: { profit: { count: 2, average: 800 } },
    diagnostics: [{ type: "error", severity: "high", message: "x" }],
    recommendations: [{ text: "x" }],
    topRecommendations: [{ text: "Corriger en priorité : x", severity: "high" }],
    generatedAt: "2026-09-07T00:00:00Z",
  };
}

function baseHook(overrides = {}) {
  return { isRunning: false, error: null, generateAnalyticsReport: jest.fn().mockResolvedValue(report()), ...overrides };
}

test("generates the report for the routed runId on mount", () => {
  const generateAnalyticsReport = jest.fn().mockResolvedValue(report());
  useAnalytics.mockReturnValue(baseHook({ generateAnalyticsReport }));
  renderAtReport();
  expect(generateAnalyticsReport).toHaveBeenCalledWith("academie-c1-g1");
});

test("shows the summary, chart and top recommendations once the report resolves", async () => {
  useAnalytics.mockReturnValue(baseHook());
  renderAtReport();

  expect(await screen.findByText(/groupe a · source : academie/i)).toBeInTheDocument();
  expect(screen.getByText("70")).toBeInTheDocument();
  expect(screen.getByText(/corriger en priorité/i)).toBeInTheDocument();
});

test("shows a loading state before the report resolves", () => {
  useAnalytics.mockReturnValue(baseHook({ isRunning: true, generateAnalyticsReport: jest.fn(() => new Promise(() => {})) }));
  renderAtReport();
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows an error banner when report generation fails", async () => {
  useAnalytics.mockReturnValue(baseHook({ error: new Error("Introuvable"), generateAnalyticsReport: jest.fn().mockRejectedValue(new Error("Introuvable")) }));
  renderAtReport();
  expect(await screen.findByText(/introuvable/i)).toBeInTheDocument();
});

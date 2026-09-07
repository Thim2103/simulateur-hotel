import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AnalyticsCompare from "./AnalyticsCompare";
import { useAnalytics } from "../hooks/useAnalytics";

jest.mock("../hooks/useAnalytics");

function renderAtCompare() {
  return render(
    <MemoryRouter initialEntries={["/analytics/compare/run-a/run-b"]}>
      <Routes>
        <Route path="/analytics/compare/:runIdA/:runIdB" element={<AnalyticsCompare />} />
      </Routes>
    </MemoryRouter>
  );
}

function comparison() {
  return {
    runA: { id: "run-a", label: "Groupe A" },
    runB: { id: "run-b", label: "Groupe B" },
    scoring: { a: { label: "Groupe A", finalScore: 70 }, b: { label: "Groupe B", finalScore: 50 }, delta: 20 },
    kpis: [{ kpi: "profit", a: 1000, b: 700, leader: "a" }],
    decisions: [{ field: "pricingADR", a: { timesSet: 3 }, b: { timesSet: 1 } }],
    diagnostics: { a: { errors: 0, anomalies: 1, opportunities: 2 }, b: { errors: 2, anomalies: 0, opportunities: 0 } },
  };
}

function baseHook(overrides = {}) {
  return { isRunning: false, error: null, compareRuns: jest.fn().mockResolvedValue(comparison()), ...overrides };
}

test("compares the two runs named in the route", async () => {
  const compareRuns = jest.fn().mockResolvedValue(comparison());
  useAnalytics.mockReturnValue(baseHook({ compareRuns }));
  renderAtCompare();

  expect(compareRuns).toHaveBeenCalledWith("run-a", "run-b");
  expect(await screen.findByText(/groupe a vs groupe b/i)).toBeInTheDocument();
});

test("shows scoring, KPI, decision and diagnostic comparisons", async () => {
  useAnalytics.mockReturnValue(baseHook());
  renderAtCompare();

  expect(await screen.findByText("profit")).toBeInTheDocument();
  expect(screen.getByText("1000")).toBeInTheDocument();
  expect(screen.getByText("pricingADR")).toBeInTheDocument();
  expect(screen.getAllByText(/erreurs/i).length).toBeGreaterThan(0);
});

test("shows an error banner when the comparison fails", async () => {
  useAnalytics.mockReturnValue(baseHook({ error: new Error("Introuvable"), compareRuns: jest.fn().mockRejectedValue(new Error("Introuvable")) }));
  renderAtCompare();
  expect(await screen.findByText(/introuvable/i)).toBeInTheDocument();
});

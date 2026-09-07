import { compareDecisionApproaches, compareDiagnosticCounts, compareKpiAverages, compareStrategies } from "./analyticsComparison";

function analysis(overrides = {}) {
  return {
    runId: "a",
    ownerLabel: "Groupe A",
    kpis: { profit: { average: 1000 } },
    decisions: { fields: [{ field: "pricingADR", timesSet: 3, averageSwing: 10 }] },
    diagnostics: [{ type: "error" }, { type: "opportunity" }],
    replayRun: { id: "a", scoreHistory: [70] },
    ...overrides,
  };
}

test("compareKpiAverages reports both sides' averages and the leader", () => {
  const a = analysis({ kpis: { profit: { average: 1000 } } });
  const b = analysis({ kpis: { profit: { average: 1500 } } });
  const result = compareKpiAverages(a, b);
  expect(result).toEqual([{ kpi: "profit", a: 1000, b: 1500, leader: "b" }]);
});

test("compareKpiAverages handles a KPI only present on one side", () => {
  const a = analysis({ kpis: { profit: { average: 1000 } } });
  const b = analysis({ kpis: {} });
  const result = compareKpiAverages(a, b);
  expect(result).toEqual([{ kpi: "profit", a: 1000, b: null, leader: "a" }]);
});

test("compareDecisionApproaches lines up both sides' decision fields", () => {
  const a = analysis({ decisions: { fields: [{ field: "pricingADR", timesSet: 3, averageSwing: 10 }] } });
  const b = analysis({ decisions: { fields: [{ field: "headcount", timesSet: 1, averageSwing: 0 }] } });
  const result = compareDecisionApproaches(a, b);
  expect(result.map((entry) => entry.field).sort()).toEqual(["headcount", "pricingADR"]);
});

test("compareDiagnosticCounts tallies errors/anomalies/opportunities per side", () => {
  const a = analysis({ diagnostics: [{ type: "error" }, { type: "error" }] });
  const b = analysis({ diagnostics: [{ type: "opportunity" }] });
  expect(compareDiagnosticCounts(a, b)).toEqual({
    a: { errors: 2, anomalies: 0, opportunities: 0 },
    b: { errors: 0, anomalies: 0, opportunities: 1 },
  });
});

test("compareStrategies bundles scoring, KPIs, decisions and diagnostics", () => {
  const a = analysis({ replayRun: { id: "a", scoreHistory: [70] } });
  const b = analysis({ runId: "b", ownerLabel: "Groupe B", replayRun: { id: "b", scoreHistory: [50] } });
  const result = compareStrategies(a, b);
  expect(result.runA).toEqual({ id: "a", label: "Groupe A" });
  expect(result.runB).toEqual({ id: "b", label: "Groupe B" });
  expect(result.scoring.leader).toBe("a");
  expect(result.kpis).toBeDefined();
  expect(result.decisions).toBeDefined();
  expect(result.diagnostics).toBeDefined();
});

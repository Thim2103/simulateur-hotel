import { detectAnomalies, detectErrors, detectOpportunities, generateDiagnostics } from "./analyticsDiagnostics";

function cycle(cycleIndex, overrides = {}) {
  return { cycleIndex, baseReport: { profit: 1000 }, blocked: false, violations: [], ...overrides };
}

test("detectAnomalies flags a cycle whose KPI deviates sharply from the run's own average", () => {
  const cycles = [cycle(0), cycle(1), cycle(2, { baseReport: { profit: 50000 } })];
  const kpiAnalysis = { profit: { average: 1000 } };
  const anomalies = detectAnomalies(cycles, kpiAnalysis);
  expect(anomalies).toEqual([expect.objectContaining({ type: "anomaly", cycleIndex: 2 })]);
});

test("detectAnomalies finds nothing when every cycle is close to average", () => {
  const cycles = [cycle(0), cycle(1)];
  expect(detectAnomalies(cycles, { profit: { average: 1000 } })).toEqual([]);
});

test("detectErrors flags a blocked cycle with its violation messages", () => {
  const cycles = [cycle(0, { blocked: true, violations: [{ message: "Tarif hors limites." }] })];
  const errors = detectErrors(cycles, { objectives: [] });
  expect(errors).toEqual([expect.objectContaining({ type: "error", severity: "high" })]);
  expect(errors[0].message).toContain("Tarif hors limites");
});

test("detectErrors flags an unmet required objective", () => {
  const objectivesResult = { objectives: [{ id: "profit", label: "Profit positif", required: true, achieved: false, current: -100, target: 0 }] };
  const errors = detectErrors([], objectivesResult);
  expect(errors).toEqual([expect.objectContaining({ type: "error" })]);
});

test("detectErrors ignores an unmet objective that isn't required", () => {
  const objectivesResult = { objectives: [{ id: "bonus", required: false, achieved: false }] };
  expect(detectErrors([], objectivesResult)).toEqual([]);
});

test("detectOpportunities flags a decision lever that was never used", () => {
  const decisionAnalysis = { fields: [{ field: "marketingBudget", timesSet: 0 }] };
  const opportunities = detectOpportunities(decisionAnalysis, { objectives: [] });
  expect(opportunities).toEqual([expect.objectContaining({ type: "opportunity" })]);
});

test("detectOpportunities flags an objective that came close but missed", () => {
  const objectivesResult = { objectives: [{ id: "adr", label: "ADR cible", achieved: false, current: 145, target: 150 }] };
  const opportunities = detectOpportunities({ fields: [] }, objectivesResult);
  expect(opportunities).toEqual([expect.objectContaining({ type: "opportunity" })]);
});

test("detectOpportunities ignores an objective that's far from its target", () => {
  const objectivesResult = { objectives: [{ id: "adr", achieved: false, current: 50, target: 150 }] };
  expect(detectOpportunities({ fields: [] }, objectivesResult)).toEqual([]);
});

test("generateDiagnostics combines anomalies, errors and opportunities", () => {
  const cycles = [cycle(0, { blocked: true, violations: [{ message: "x" }] })];
  const diagnostics = generateDiagnostics({
    cycles,
    kpiAnalysis: { profit: { average: 1000 } },
    decisionAnalysis: { fields: [{ field: "marketingBudget", timesSet: 0 }] },
    objectivesResult: { objectives: [] },
  });
  expect(diagnostics.map((d) => d.type).sort()).toEqual(["error", "opportunity"]);
});

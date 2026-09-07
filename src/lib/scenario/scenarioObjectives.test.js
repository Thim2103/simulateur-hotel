import { evaluateObjectives, readKpi } from "./scenarioObjectives";

test("readKpi walks a dotted path", () => {
  expect(readKpi({ finance: { totalProfit: 1200 } }, "finance.totalProfit")).toBe(1200);
});

test("readKpi returns null for a missing path instead of throwing", () => {
  expect(readKpi({}, "finance.totalProfit")).toBeNull();
  expect(readKpi(null, "finance.totalProfit")).toBeNull();
});

test("evaluateObjectives marks an objective achieved when its comparator is satisfied", () => {
  const objectives = [{ id: "o1", kpi: "finance.totalProfit", comparator: "gte", target: 1000 }];
  const { objectives: results, allAchieved } = evaluateObjectives({ finance: { totalProfit: 1500 } }, objectives);
  expect(results[0].achieved).toBe(true);
  expect(allAchieved).toBe(true);
});

test("allRequiredAchieved is false when a required objective fails, even if others pass", () => {
  const objectives = [
    { id: "required", kpi: "finance.totalProfit", comparator: "gte", target: 5000, required: true },
    { id: "optional", kpi: "finance.totalProfit", comparator: "gte", target: 0, required: false },
  ];
  const { allRequiredAchieved, allAchieved } = evaluateObjectives({ finance: { totalProfit: 100 } }, objectives);
  expect(allRequiredAchieved).toBe(false);
  expect(allAchieved).toBe(false);
});

test("an objective referencing a missing KPI is simply not achieved, not an error", () => {
  const objectives = [{ id: "o1", kpi: "does.not.exist", comparator: "gte", target: 0 }];
  const { objectives: results } = evaluateObjectives({}, objectives);
  expect(results[0]).toEqual(expect.objectContaining({ current: null, achieved: false }));
});

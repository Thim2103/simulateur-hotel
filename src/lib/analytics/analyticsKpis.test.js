import { analyzeKpi, analyzeKpis } from "./analyticsKpis";

function cycle(cycleIndex, profit) {
  return { cycleIndex, score: profit / 10, baseReport: { profit } };
}

test("analyzeKpi reports count/min/max/average for a numeric series", () => {
  const result = analyzeKpi([100, 200, 300]);
  expect(result).toEqual(expect.objectContaining({ count: 3, min: 100, max: 300, average: 200 }));
});

test("analyzeKpi ignores nulls in the series", () => {
  const result = analyzeKpi([100, null, 300]);
  expect(result.count).toBe(2);
  expect(result.average).toBe(200);
});

test("analyzeKpi detects an increasing trend", () => {
  expect(analyzeKpi([100, 100, 200, 300]).trend).toBe("increasing");
});

test("analyzeKpi detects a decreasing trend", () => {
  expect(analyzeKpi([300, 300, 200, 100]).trend).toBe("decreasing");
});

test("analyzeKpi reports 'stable' for a flat series or too few points", () => {
  expect(analyzeKpi([100, 100, 100]).trend).toBe("stable");
  expect(analyzeKpi([100]).trend).toBe("stable");
});

test("analyzeKpis returns one analysis per tracked KPI", () => {
  const cycles = [cycle(0, 500), cycle(1, 900)];
  const result = analyzeKpis(cycles);
  expect(result.profit).toEqual(expect.objectContaining({ count: 2, min: 500, max: 900 }));
  expect(result.score).toBeDefined();
});

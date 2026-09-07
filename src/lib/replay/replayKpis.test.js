import { allKpiSeries, kpiSeries, kpisForCycle } from "./replayKpis";

function cycle(cycleIndex, overrides = {}) {
  return {
    cycleIndex,
    score: 60,
    baseReport: {
      profit: 1200,
      hotelRevenue: { netRevenue: 800 },
      restaurantRevenue: { netRevenue: 300 },
      expenses: { total: 400 },
      rmReport: { pricing: { recommendedADR: 150 } },
      progressionReport: { reputation: 70 },
      restaurantReport: { demand: 65 },
      ...overrides,
    },
  };
}

test("kpisForCycle extracts a normalized, chart-friendly KPI set", () => {
  expect(kpisForCycle(cycle(0))).toEqual({
    cycleIndex: 0,
    score: 60,
    profit: 1200,
    hotelRevenue: 800,
    restaurantRevenue: 300,
    expenses: 400,
    recommendedADR: 150,
    reputation: 70,
    restaurantDemand: 65,
  });
});

test("kpisForCycle never throws on a missing/malformed cycle", () => {
  expect(() => kpisForCycle(null)).not.toThrow();
  expect(kpisForCycle(null)).toEqual(expect.objectContaining({ cycleIndex: null, score: null, profit: null }));
});

test("kpiSeries extracts one KPI's values across every cycle", () => {
  const cycles = [cycle(0, { profit: 100 }), cycle(1, { profit: 200 })];
  expect(kpiSeries(cycles, "profit")).toEqual([100, 200]);
});

test("allKpiSeries returns every tracked KPI as its own series", () => {
  const cycles = [cycle(0), cycle(1)];
  const series = allKpiSeries(cycles);
  expect(series.profit).toEqual([1200, 1200]);
  expect(series.reputation).toEqual([70, 70]);
  expect(Object.keys(series)).toEqual(["score", "profit", "hotelRevenue", "restaurantRevenue", "expenses", "recommendedADR", "reputation", "restaurantDemand"]);
});

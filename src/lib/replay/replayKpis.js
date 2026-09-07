// Extracts a normalized, chart-friendly set of KPIs from a cycle's
// DailyReport (see lib/dailyCycle/runDailyCycle.js's return shape) plus
// the scenario's own score for that cycle.
import { safeArray, safeNumber } from "../safe";

export function kpisForCycle(cycle) {
  const report = cycle?.baseReport || {};
  return {
    cycleIndex: cycle?.cycleIndex ?? null,
    score: cycle?.score ?? null,
    profit: safeNumber(report.profit, null),
    hotelRevenue: safeNumber(report.hotelRevenue?.netRevenue, null),
    restaurantRevenue: safeNumber(report.restaurantRevenue?.netRevenue, null),
    expenses: safeNumber(report.expenses?.total, null),
    recommendedADR: safeNumber(report.rmReport?.pricing?.recommendedADR, null),
    reputation: safeNumber(report.progressionReport?.reputation, null),
    restaurantDemand: safeNumber(report.restaurantReport?.demand, null),
  };
}

// One KPI's value across every cycle -- exactly what a line chart needs.
export function kpiSeries(cycles, kpiKey) {
  return safeArray(cycles).map((cycle) => kpisForCycle(cycle)[kpiKey] ?? null);
}

export function allKpiSeries(cycles) {
  const perCycle = safeArray(cycles).map(kpisForCycle);
  const keys = ["score", "profit", "hotelRevenue", "restaurantRevenue", "expenses", "recommendedADR", "reputation", "restaurantDemand"];
  return Object.fromEntries(keys.map((key) => [key, perCycle.map((entry) => entry[key])]));
}

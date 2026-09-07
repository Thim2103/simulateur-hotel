// Cycle-by-cycle KPI analysis on top of a ReplayRun: trend, volatility,
// min/max/average per KPI -- built directly on lib/replay/replayKpis.js's
// already-normalized series rather than re-reading raw cycle reports.
import { allKpiSeries } from "../replay/replayKpis";

function numericValues(series) {
  return series.filter((value) => typeof value === "number" && Number.isFinite(value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

// Simple linear trend: compares the first and second half's averages.
function trendOf(values) {
  if (values.length < 2) return "stable";
  const mid = Math.floor(values.length / 2);
  const firstHalf = average(values.slice(0, mid || 1));
  const secondHalf = average(values.slice(mid));
  if (firstHalf === null || secondHalf === null) return "stable";
  const delta = secondHalf - firstHalf;
  const threshold = Math.abs(firstHalf) * 0.05 || 1;
  if (delta > threshold) return "increasing";
  if (delta < -threshold) return "decreasing";
  return "stable";
}

// Coefficient of variation (stddev / |mean|) -- a simple, scale-independent
// volatility measure so a KPI in the thousands and one in the tens are
// comparable.
function volatilityOf(values, mean) {
  if (values.length < 2 || !mean) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.abs(Math.sqrt(variance) / mean);
}

export function analyzeKpi(series) {
  const values = numericValues(series);
  const mean = average(values);
  return {
    count: values.length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    average: mean !== null ? Math.round(mean * 100) / 100 : null,
    trend: trendOf(values),
    volatility: Math.round(volatilityOf(values, mean) * 1000) / 1000,
  };
}

// One trend/volatility summary per KPI tracked by the replay.
export function analyzeKpis(cycles) {
  const series = allKpiSeries(cycles);
  return Object.fromEntries(Object.entries(series).map(([key, values]) => [key, analyzeKpi(values)]));
}

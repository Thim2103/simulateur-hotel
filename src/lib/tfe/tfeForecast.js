// 36-month TFE forecast, three scenarios (optimiste/réaliste/pessimiste)
// -- "prévisions 36 mois" (section 4). Extrapolates from the current
// month's own score/EBITDA-margin run-rate, same "run-rate" approach
// every other module's *Forecast.js already uses, but over a 36-month
// horizon instead of 30 days.
import { safeNumber, safeObject } from "../safe";

const HORIZON_MONTHS = 36;
const SCENARIOS = {
  optimiste: 0.15, // score/margin improve over the remaining horizon
  realiste: 0,
  pessimiste: -0.15,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ score, ebitdaMargin, growthRate, horizonMonths }) {
  const months = [];
  let currentScore = score;
  let currentMargin = ebitdaMargin;
  const monthlyGrowth = growthRate / horizonMonths;

  for (let month = 1; month <= horizonMonths; month += 1) {
    currentScore = clamp(currentScore + monthlyGrowth * 100, 0, 100);
    currentMargin = clamp(currentMargin + monthlyGrowth * 0.5, -1, 1);
    months.push({ month, score: Math.round(currentScore), ebitdaMargin: Math.round(currentMargin * 1000) / 1000 });
  }

  return {
    months,
    endScore: months[months.length - 1].score,
    endEbitdaMargin: months[months.length - 1].ebitdaMargin,
    avgScore: Math.round(months.reduce((total, entry) => total + entry.score, 0) / months.length),
  };
}

// tfeState: the current TfeState (see tfeState.js) -- reads
// score.total/ebitdaMargin from the latest performanceHistory entry as
// the forecast's starting point.
export function generateTfeForecast(tfeState, { horizonMonths = HORIZON_MONTHS } = {}) {
  const state = safeObject(tfeState);
  const latest = state.performanceHistory?.[state.performanceHistory.length - 1] || {};
  const score = safeNumber(state.score?.total ?? latest.score, 55);
  const ebitdaMargin = safeNumber(latest.ebitdaMargin, 0);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ score, ebitdaMargin, growthRate, horizonMonths }),
    ])
  );

  return { horizonMonths, generatedAt: new Date().toISOString(), scenarios };
}

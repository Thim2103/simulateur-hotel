// 30-day clients forecast, three scenarios (optimiste/réaliste/
// pessimiste) -- extrapolates from the current cycle's satisfaction,
// loyalty and review rating run-rate. Same approach
// lib/housekeeping/housekeepingForecast.js uses.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;

// Growth rates per scenario: positive = improving, negative = declining.
const SCENARIOS = {
  optimiste: 0.008,   // satisfaction and loyalty improve ~8 pp over 30 days
  realiste: 0,
  pessimiste: -0.006, // satisfaction and loyalty slip ~6 pp over 30 days
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ satisfaction, loyalty, avgRating, returnRate, growthRate, horizonDays }) {
  const days = [];
  let curSat = satisfaction;
  let curLoy = loyalty;
  let curRating = avgRating;
  let curReturn = returnRate;

  for (let day = 1; day <= horizonDays; day += 1) {
    curSat = clamp(curSat + curSat * growthRate, 0, 100);
    curLoy = clamp(curLoy + curLoy * growthRate * 0.5, 0, 100);
    curRating = clamp(curRating + curRating * growthRate * 0.01, 1, 5);
    curReturn = clamp(curReturn + curReturn * growthRate * 0.3, 0, 100);
    days.push({
      day,
      satisfaction: Math.round(curSat),
      loyalty: Math.round(curLoy),
      avgRating: Math.round(curRating * 10) / 10,
      returnRate: Math.round(curReturn),
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + safeNumber(entry[key], 0), 0) / days.length);

  return {
    days,
    avgSatisfaction: avg("satisfaction"),
    avgLoyalty: avg("loyalty"),
    endSatisfaction: days[days.length - 1].satisfaction,
    endLoyalty: days[days.length - 1].loyalty,
    endRating: days[days.length - 1].avgRating,
  };
}

export function generateClientsForecast(clientsState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(clientsState);
  const satisfaction = safeNumber(state.satisfaction, 65);
  const loyalty = safeNumber(state.loyalty, 50);
  const reviews = safeObject(state.reviews);
  const avgRating = safeNumber(reviews.avgRating, 3.5);
  const behaviors = safeObject(state.behaviors);
  const returnRate = safeNumber(behaviors.returnRate, 40);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ satisfaction, loyalty, avgRating, returnRate, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

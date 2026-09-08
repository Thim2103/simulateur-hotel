// 30-day ESG forecast, three scenarios (optimiste/réaliste/pessimiste)
// -- extrapolates from the current cycle's own energy/water/waste/CO₂/
// score run-rate, same "run-rate" approach lib/finance/financeForecast
// .js/lib/staff/staffForecast.js/lib/marketing/marketingForecast.js
// already use.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;
const SCENARIOS = {
  optimiste: -0.12, // consumption/CO2 fall, score rises, over the horizon
  realiste: 0,
  pessimiste: 0.12,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ energy, water, waste, co2, score, growthRate, horizonDays }) {
  const days = [];
  let currentEnergy = energy;
  let currentWater = water;
  let currentWaste = waste;
  let currentCo2 = co2;
  let currentScore = score;
  const dailyGrowth = growthRate / horizonDays;

  for (let day = 1; day <= horizonDays; day += 1) {
    currentEnergy = Math.max(0, currentEnergy * (1 + dailyGrowth));
    currentWater = Math.max(0, currentWater * (1 + dailyGrowth));
    currentWaste = Math.max(0, currentWaste * (1 + dailyGrowth));
    currentCo2 = Math.max(0, currentCo2 * (1 + dailyGrowth));
    currentScore = clamp(currentScore - dailyGrowth * 100, 0, 100);
    days.push({
      day,
      energy: Math.round(currentEnergy),
      water: Math.round(currentWater * 100) / 100,
      waste: Math.round(currentWaste),
      co2: Math.round(currentCo2),
      score: Math.round(currentScore),
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + entry[key], 0) / days.length);

  return {
    days,
    avgEnergy: avg("energy"),
    avgCo2: avg("co2"),
    endScore: days[days.length - 1].score,
    endCo2: days[days.length - 1].co2,
  };
}

// esgState: the current EsgState (see esgState.js) -- reads energy/
// water/waste/co2/score as the forecast's starting point.
export function generateEsgForecast(esgState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(esgState);
  const energy = safeNumber(state.energy, 100);
  const water = safeNumber(state.water, 10);
  const waste = safeNumber(state.waste, 20);
  const co2 = safeNumber(state.co2, 80);
  const score = safeNumber(state.score, 55);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ energy, water, waste, co2, score, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

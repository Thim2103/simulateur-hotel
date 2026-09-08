// 30-day marketing forecast, three scenarios (optimiste/réaliste/
// pessimiste) -- extrapolates from the current cycle's own ROI/
// conversion/reputation run-rate, same "run-rate" approach
// lib/finance/financeForecast.js/lib/staff/staffForecast.js already use.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;
const SCENARIOS = {
  optimiste: 0.15, // ROI/conversion/reputation improve over the horizon
  realiste: 0,
  pessimiste: -0.15,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ roi, conversion, reputation, growthRate, horizonDays }) {
  const days = [];
  let currentRoi = roi;
  let currentConversion = conversion;
  let currentReputation = reputation;
  const dailyGrowth = growthRate / horizonDays;

  for (let day = 1; day <= horizonDays; day += 1) {
    currentRoi = Math.max(0, currentRoi * (1 + dailyGrowth));
    currentConversion = clamp(currentConversion * (1 + dailyGrowth), 0, 100);
    currentReputation = clamp(currentReputation + dailyGrowth * 100, 0, 100);
    days.push({
      day,
      roi: Math.round(currentRoi * 100) / 100,
      conversion: Math.round(currentConversion * 10) / 10,
      reputation: Math.round(currentReputation),
    });
  }

  const avg = (key) => Math.round((days.reduce((total, entry) => total + entry[key], 0) / days.length) * 100) / 100;

  return {
    days,
    avgRoi: avg("roi"),
    avgConversion: avg("conversion"),
    endReputation: days[days.length - 1].reputation,
  };
}

// marketingState: the current MarketingState (see marketingState.js) --
// reads roi/conversion/reputation as the forecast's starting point.
export function generateMarketingForecast(marketingState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(marketingState);
  const roi = safeNumber(state.roi?.overallRoi, 1);
  const conversion = safeNumber(state.conversion?.conversionRate, 5);
  const reputation = safeNumber(state.reputation, 60);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ roi, conversion, reputation, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

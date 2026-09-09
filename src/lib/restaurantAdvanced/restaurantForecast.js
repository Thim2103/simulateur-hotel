// 30-day F&B forecast, three scenarios (optimiste/réaliste/pessimiste) --
// extrapolates from the current cycle's food cost, gross margin and
// average popularity run-rate. Same approach lib/clients/clientsForecast.js
// and lib/housekeeping/housekeepingForecast.js use.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;

// Growth rates per scenario. Food cost moves the opposite way from
// margin/popularity under the same growth rate: "optimiste" means food
// cost falls while margin and popularity rise.
const SCENARIOS = {
  optimiste: 0.007,
  realiste: 0,
  pessimiste: -0.005,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ foodCost, grossMargin, popularity, growthRate, horizonDays }) {
  const days = [];
  let curFoodCost = foodCost;
  let curMargin = grossMargin;
  let curPopularity = popularity;

  for (let day = 1; day <= horizonDays; day += 1) {
    curFoodCost = clamp(curFoodCost - curFoodCost * growthRate * 0.6, 0, 100);
    curMargin = clamp(curMargin + curMargin * growthRate, 0, 100);
    curPopularity = clamp(curPopularity + curPopularity * growthRate * 0.8, 0, 100);
    days.push({
      day,
      foodCost: Math.round(curFoodCost * 10) / 10,
      grossMargin: Math.round(curMargin * 10) / 10,
      popularity: Math.round(curPopularity),
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + safeNumber(entry[key], 0), 0) / days.length * 10) / 10;

  return {
    days,
    avgFoodCost: avg("foodCost"),
    avgGrossMargin: avg("grossMargin"),
    avgPopularity: Math.round(avg("popularity")),
    endFoodCost: days[days.length - 1].foodCost,
    endGrossMargin: days[days.length - 1].grossMargin,
    endPopularity: days[days.length - 1].popularity,
  };
}

export function generateRestaurantForecast(restaurantAdvancedState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(restaurantAdvancedState);
  const foodCost = safeObject(state.foodCost);
  const profitability = safeObject(state.profitability);
  const popularity = safeObject(state.popularity);

  const foodCostOverall = safeNumber(foodCost.overall, 30);
  const grossMargin = safeNumber(profitability.grossMargin, 60);
  const avgPopularity = (popularity.items || []).length
    ? Math.round((popularity.items.reduce((sum, item) => sum + safeNumber(item.popularity, 0), 0) / popularity.items.length))
    : 50;

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ foodCost: foodCostOverall, grossMargin, popularity: avgPopularity, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

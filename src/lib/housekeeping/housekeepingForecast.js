// 30-day housekeeping forecast, three scenarios (optimiste/réaliste/
// pessimiste) -- extrapolates from the current cycle's own workload/
// overload/quality run-rate, same "run-rate" approach every other
// module's *Forecast.js already uses.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;
const SCENARIOS = {
  optimiste: -0.1, // workload/overload ease off, quality improves
  realiste: 0,
  pessimiste: 0.15,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ overload, quality, roomsToClean, growthRate, horizonDays }) {
  const days = [];
  let currentOverload = overload;
  let currentQuality = quality;
  let currentRooms = roomsToClean;
  const dailyGrowth = growthRate / horizonDays;

  for (let day = 1; day <= horizonDays; day += 1) {
    currentOverload = Math.max(0, currentOverload * (1 + dailyGrowth));
    currentRooms = Math.max(0, currentRooms * (1 + dailyGrowth));
    currentQuality = clamp(currentQuality - dailyGrowth * 100, 0, 100);
    days.push({
      day,
      overload: Math.round(currentOverload),
      roomsToClean: Math.round(currentRooms),
      quality: Math.round(currentQuality),
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + entry[key], 0) / days.length);

  return {
    days,
    avgOverload: avg("overload"),
    avgQuality: avg("quality"),
    endOverload: days[days.length - 1].overload,
    endQuality: days[days.length - 1].quality,
  };
}

// housekeepingState: the current HousekeepingState (see
// housekeepingState.js) -- reads overload/quality/workload as the
// forecast's starting point.
export function generateHousekeepingForecast(housekeepingState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(housekeepingState);
  const overload = safeNumber(state.overload, 60);
  const quality = safeNumber(state.quality, 65);
  const roomsToClean = safeNumber(state.workload?.roomsToClean, 5);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ overload, quality, roomsToClean, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

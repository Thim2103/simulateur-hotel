// 30-day RM Advanced forecast, three scenarios (base/optimiste/
// pessimiste) -- extrapolates from the current cycle's compression,
// direct-channel share and net ADR run-rate. Same approach
// lib/clients/clientsForecast.js and lib/restaurantAdvanced/
// restaurantForecast.js use, with RM's own naming for the base scenario
// (no change vs. today's numbers) requested for this module.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;

const SCENARIOS = {
  optimiste: 0.007,
  base: 0,
  pessimiste: -0.006,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ compression, directShare, netAdr, growthRate, horizonDays }) {
  const days = [];
  let curCompression = compression;
  let curDirectShare = directShare;
  let curNetAdr = netAdr;

  for (let day = 1; day <= horizonDays; day += 1) {
    curCompression = clamp(curCompression + curCompression * growthRate * 0.5, 0, 100);
    curDirectShare = clamp(curDirectShare + curDirectShare * growthRate * 0.6, 0, 100);
    curNetAdr = clamp(curNetAdr + curNetAdr * growthRate, 0, 100000);
    days.push({
      day,
      compression: Math.round(curCompression),
      directShare: Math.round(curDirectShare),
      netAdr: Math.round(curNetAdr),
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + safeNumber(entry[key], 0), 0) / days.length);

  return {
    days,
    avgCompression: avg("compression"),
    avgDirectShare: avg("directShare"),
    avgNetAdr: avg("netAdr"),
    endCompression: days[days.length - 1].compression,
    endDirectShare: days[days.length - 1].directShare,
    endNetAdr: days[days.length - 1].netAdr,
  };
}

export function generateRmAdvancedForecast(rmAdvancedState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(rmAdvancedState);
  const compression = safeNumber(state.compression?.avgCompression, 55);
  const directShare = safeNumber(state.otaStrategy?.directShare, 40);
  const netAdrValues = Object.values(safeObject(state.otaStrategy?.netAdrByChannel));
  const netAdr = netAdrValues.length
    ? netAdrValues.reduce((sum, value) => sum + safeNumber(value, 0), 0) / netAdrValues.length
    : 100;

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ compression, directShare, netAdr, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

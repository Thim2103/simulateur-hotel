// 30-day HR forecast, three scenarios (optimiste/réaliste/pessimiste) --
// "prévisions RH (absentéisme, surcharge)" (see the Refonte RH request's
// section 1/4). Mirrors lib/finance/financeForecast.js's run-rate
// extrapolation, but projects the HR feedback loop instead of a cash
// balance: each scenario nudges overload (activity level) day by day,
// then re-derives morale/absenteeism/productivity/turnover from it with
// the exact same formulas staffCalculations.js uses for the current
// cycle, so the forecast stays internally consistent with "today"'s
// figures rather than being a separate, disconnected model.
import { safeNumber, safeObject } from "../safe";
import { computeAbsenteeism, computeProductivity, computeTurnover } from "./staffCalculations";

const HORIZON_DAYS = 30;
const SCENARIOS = {
  optimiste: -0.15, // activity/overload eases off (recent hires, better organization)
  realiste: 0,
  pessimiste: 0.2, // activity/overload keeps climbing
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function projectScenario({ overload, morale, headcount, growthRate, horizonDays }) {
  const days = [];
  let currentOverload = overload;
  let currentMorale = morale;
  const dailyGrowth = growthRate / horizonDays;

  for (let day = 1; day <= horizonDays; day += 1) {
    currentOverload = Math.max(0, currentOverload * (1 + dailyGrowth));
    // Morale drifts slowly toward an equilibrium set by the current
    // overload (sustained overload erodes it; a comfortable workload lets
    // it recover), same directionality as
    // lib/dailyCycle/updateStaff.js's fatigue/recovery model.
    const moraleTarget = clamp(80 - Math.max(0, currentOverload - 100) * 0.4, 20, 90);
    currentMorale = clamp(currentMorale + (moraleTarget - currentMorale) * 0.1, 0, 100);

    const absenteeism = computeAbsenteeism({ morale: currentMorale, overload: currentOverload });
    // No per-person roster to project day by day here (see this file's
    // header): reuses computeProductivity()'s own baseline-team fallback
    // (DEFAULT_PRODUCTIVITY), only varying the overload penalty.
    const productivity = computeProductivity({ restaurantStaff: [], overload: currentOverload });
    const turnover = computeTurnover({ morale: currentMorale, overload: currentOverload, departuresLast: 0, headcount });

    days.push({
      day,
      overload: Math.round(currentOverload),
      morale: Math.round(currentMorale),
      absenteeism,
      productivity,
      turnoverRate: turnover.estimatedRate,
    });
  }

  const avg = (key) => Math.round(days.reduce((total, entry) => total + entry[key], 0) / days.length);

  return {
    days,
    avgMorale: avg("morale"),
    avgAbsenteeism: avg("absenteeism"),
    avgOverload: avg("overload"),
    endOverload: days[days.length - 1].overload,
    endTurnoverRate: days[days.length - 1].turnoverRate,
  };
}

// staffState: the current StaffState (see staffState.js) -- reads
// overload/morale/headcount as the forecast's starting point.
export function generateStaffForecast(staffState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(staffState);
  const overload = safeNumber(state.overload, 60);
  const morale = safeNumber(state.morale, 65);
  const headcount = safeObject(state.headcount);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ overload, morale, headcount, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}

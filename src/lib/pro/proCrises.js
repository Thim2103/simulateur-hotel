// Crisis tracking -- turns proScenario.js's scripted timeline triggers
// into rolling instances with a remaining duration, so
// pages/ProCrises.jsx can show what's actively impacting the
// establishment right now, not just what happened once.
import { safeArray } from "../safe";

const SEVERITY_BY_DEPARTMENT_DEFAULT = "medium";

// options:
//   triggeredThisMonth: the "crisis"-type entries from
//     proScenario.js's applyScheduledEvents() for this exact month.
//   previousCrises: the Pro state's own `crises` array from last month.
//   month: the month just played.
export function computeCrises({ triggeredThisMonth = [], previousCrises = [], month = 0 } = {}) {
  const rolledOver = safeArray(previousCrises)
    .map((crisis) => ({ ...crisis, monthsRemaining: crisis.monthsRemaining - 1 }))
    .map((crisis) => (crisis.monthsRemaining <= 0 ? { ...crisis, active: false, resolvedOnMonth: crisis.resolvedOnMonth ?? month } : crisis));

  const newlyTriggered = safeArray(triggeredThisMonth)
    .filter((entry) => entry.type === "crisis")
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      department: entry.department || "general",
      severity: SEVERITY_BY_DEPARTMENT_DEFAULT,
      triggeredOnMonth: month,
      monthsRemaining: entry.durationMonths ?? 3,
      active: true,
      resolvedOnMonth: null,
    }));

  return [...rolledOver, ...newlyTriggered];
}

export function activeCrises(crises) {
  return safeArray(crises).filter((crisis) => crisis.active);
}

export function crisesByDepartment(crises) {
  return activeCrises(crises).reduce((acc, crisis) => {
    const department = crisis.department || "general";
    acc[department] = acc[department] || [];
    acc[department].push(crisis);
    return acc;
  }, {});
}

// A light impact estimate a diagnostics/score pass can subtract --
// deliberately simple (crisis count * a per-crisis penalty), since each
// crisis's real numeric effect is already applied to the hotel bundle by
// proScenario.js's own `apply` transform; this is only a secondary,
// perception-level penalty (e.g. for scoring "operating under crisis").
export function estimateCrisisImpact(crises) {
  const active = activeCrises(crises);
  return { count: active.length, scorePenalty: Math.min(20, active.length * 5) };
}

export const proCrises = { computeCrises, activeCrises, crisesByDepartment, estimateCrisisImpact };
export default proCrises;

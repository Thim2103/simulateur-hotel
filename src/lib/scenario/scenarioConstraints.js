// Applies/checks a scenario's Constraints (budget, staffing, pricing,
// forbidden actions) against the current state, before a decision is
// allowed to run through the engine.
import { safeArray, safeNumber, safeObject } from "../safe";

// decisions: a free-form object describing the player's intended actions
// this cycle -- whatever fields the caller cares to check (e.g.
// { pricingADR, forbiddenAction }). Only the fields both the decision and
// the constraints actually define are checked, so this stays useful even
// for a scenario with no constraints at all (constraints = {}).
export function checkConstraints(state, decisions, constraints) {
  const c = safeObject(constraints);
  const d = safeObject(decisions);
  const violations = [];

  const budget = safeObject(c.budget);
  const cash = safeNumber(safeObject(state).cash, safeNumber(safeObject(safeObject(state).hotelState).finance?.cash, Infinity));
  if (budget.maxDebt !== undefined && Number.isFinite(cash) && cash < -Math.abs(safeNumber(budget.maxDebt, 0))) {
    violations.push({ field: "budget.maxDebt", message: "Le découvert maximal autorisé par le scénario est dépassé." });
  }

  const pricing = safeObject(c.pricing);
  if (d.pricingADR !== undefined) {
    if (pricing.minADR !== undefined && safeNumber(d.pricingADR) < safeNumber(pricing.minADR)) {
      violations.push({ field: "pricing.minADR", message: `Le tarif proposé (${d.pricingADR}) est en dessous du minimum autorisé (${pricing.minADR}).` });
    }
    if (pricing.maxADR !== undefined && safeNumber(d.pricingADR) > safeNumber(pricing.maxADR)) {
      violations.push({ field: "pricing.maxADR", message: `Le tarif proposé (${d.pricingADR}) dépasse le maximum autorisé (${pricing.maxADR}).` });
    }
  }

  const forbiddenActions = safeArray(c.forbiddenActions);
  if (d.action && forbiddenActions.includes(d.action)) {
    violations.push({ field: "forbiddenActions", message: `L'action « ${d.action} » est interdite par ce scénario.` });
  }

  const staff = safeObject(c.staff);
  const headcount = safeNumber(d.headcount, undefined);
  if (headcount !== undefined) {
    if (staff.maxHeadcount !== undefined && headcount > safeNumber(staff.maxHeadcount)) {
      violations.push({ field: "staff.maxHeadcount", message: `L'effectif (${headcount}) dépasse le maximum autorisé (${staff.maxHeadcount}).` });
    }
    if (staff.minHeadcount !== undefined && headcount < safeNumber(staff.minHeadcount)) {
      violations.push({ field: "staff.minHeadcount", message: `L'effectif (${headcount}) est en dessous du minimum requis (${staff.minHeadcount}).` });
    }
  }

  return violations;
}

// Clamps the initial state to the scenario's starting constraints (e.g.
// starting cash) -- used once, by scenarioEngine.initScenarioRun().
export function applyConstraints(state, constraints) {
  const c = safeObject(constraints);
  const budget = safeObject(c.budget);
  if (budget.startingCash === undefined) return { state, violations: [] };

  return {
    state: { ...state, cash: safeNumber(budget.startingCash) },
    violations: [],
  };
}

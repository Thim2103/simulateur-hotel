// Persistent, resolvable equipment/zone incidents -- the real backing
// store behind the schematic view's own IncidentQuickModal (see
// ui/hotelView/schematic/IncidentQuickModal.jsx and directActions.js).
// Diagnostics themselves (lib/analytics/analyticsDiagnostics.js) are
// recomputed FRESH every cycle and carry no id/persistence of their own --
// this module is what turns a still-qualifying diagnostic into a real,
// addressable, resolvable record living at `hotelState.activeIncidents`,
// which -- unlike `hotelState.finance`/`hotelState.rooms` -- nothing else
// in the daily cycle (lib/dailyCycle/runDailyCycle.js) rebuilds or
// overwrites, so it survives untouched across day advances (see
// runDailyCycle.js's own `nextHotelState = { ...hotelState, finance: ...,
// progression: ... }` -- every other field, including this one, is simply
// carried forward).
//
// Every function here is pure: `(hotelState|hotelBundle) => next`, same
// contract as lib/housekeeping.js/lib/finance/financeEngine.js. Called
// from two integration points, both already-existing seams rather than
// new plumbing: `reconcileIncidents`/`advanceIncidentRepairs` from
// useCareer.js's own `nextDay()` (the one place per day-advance where
// this cycle's diagnostics already get computed, via `lastAnalysis`), and
// `payForRepair` from Dashboard.jsx via the existing `applyHotelAdjustment
// ()` hook (the same pure-bundle-transform primitive
// lib/dashboard/dashboardActions.js's own quick actions already persist
// through).
import { safeArray, safeObject } from "../safe";

// Diagnostics carry only "low"/"medium"/"high" (see
// analyticsDiagnostics.js) -- mapped to the player-facing tiers the spec
// asks for.
export const SEVERITY_TIER = { low: "minor", medium: "moderate", high: "critical" };

export const REPAIR_COST = { minor: 150, moderate: 500, critical: 1200 };

// How many day-advances a STANDARD repair takes before
// advanceIncidentRepairs() resolves it -- there is no sub-day "tick" unit
// anywhere in this codebase (the smallest real time unit is
// careerState.day, incremented once per "Passer la journée"), so this is
// expressed in days, scaled with severity.
export const REPAIR_DELAY_DAYS = { minor: 1, moderate: 1, critical: 2 };

export const EMERGENCY_COST_MULTIPLIER = 1.5;

// Which zone/amenity kind an incident is attributed to. Diagnostics carry
// no zone of their own (see analyticsDiagnostics.js's own shape) --
// "laundry" is the only amenity EntityFactory.js can currently put into an
// alert state in the first place (see its own AMENITY_LAYOUT-driven
// buildAmenityEntitiesFromDiagnostics()), so every incident is attributed
// there today. Kept as its own function, not a literal repeated at every
// call site, so a future per-diagnostic zone is a one-line change.
function diagnosticZone() {
  return "laundry";
}

function severityTier(diagnosticSeverity) {
  return SEVERITY_TIER[diagnosticSeverity] || "moderate";
}

function qualifies(diagnostic) {
  return diagnostic.type === "error" || diagnostic.severity === "high";
}

// A stable id derived from the diagnostic's own identity (its zone + its
// message -- the only thing that repeats identically for "the same"
// problem across days, since diagnostics carry no id of their own) so the
// same underlying problem is never double-tracked as two incidents, and a
// player who resolves it once never sees it silently reopen just because
// tomorrow's diagnostics happen to repeat the exact same message.
function diagnosticIncidentId(diagnostic) {
  return `incident:${diagnosticZone()}:${diagnostic.message}`;
}

function createIncident(diagnostic, day) {
  const tier = severityTier(diagnostic.severity);
  return {
    id: diagnosticIncidentId(diagnostic),
    zone: diagnosticZone(),
    message: diagnostic.message,
    severity: tier,
    status: "active",
    repairCost: REPAIR_COST[tier],
    createdOnDay: day,
    daysOpen: 0,
    repairEtaDay: null,
  };
}

// Reconciles this cycle's freshly-computed diagnostics against the
// hotel's own persistent incident list: a still-qualifying diagnostic
// with no matching incident yet (active, repairing, OR already resolved)
// becomes a new "active" one. An already-tracked incident, in ANY status,
// is left exactly as it is -- reconciliation only ever ADDS, it never
// removes, touches an in-progress repair, or silently reopens something
// the player already resolved.
export function reconcileIncidents(hotelState, diagnostics, day) {
  const state = safeObject(hotelState);
  const existing = safeArray(state.activeIncidents);
  const existingIds = new Set(existing.map((incident) => incident.id));

  const seenThisCycle = new Set();
  const newIncidents = safeArray(diagnostics)
    .filter(qualifies)
    .map((diagnostic) => createIncident(diagnostic, day))
    .filter((incident) => {
      if (existingIds.has(incident.id) || seenThisCycle.has(incident.id)) return false;
      seenThisCycle.add(incident.id);
      return true;
    });

  return { ...state, activeIncidents: [...existing, ...newIncidents] };
}

// A "repairing" incident whose ETA has arrived becomes "resolved" -- this
// is what makes the schematic view's own alert badge disappear (see
// EntityFactory.js's own buildAmenityEntitiesFromIncidents(), which only
// ever renders an alert/repairing badge for a NON-resolved incident).
// Called once per day advance, right after reconcileIncidents() -- see
// useCareer.js's own nextDay().
//
// Also ages every still-open incident by one full day (`daysOpen`), except
// one created today -- this is what incidentImpact.js's own grace period
// and per-day reputation malus read (see that file's own docstring).
export function advanceIncidentRepairs(hotelState, day) {
  const state = safeObject(hotelState);
  const activeIncidents = safeArray(state.activeIncidents).map((incident) => {
    if (incident.status === "resolved") return incident;
    if (incident.status === "repairing" && incident.repairEtaDay !== null && day >= incident.repairEtaDay) {
      return { ...incident, status: "resolved" };
    }
    if (Number.isFinite(incident.createdOnDay) && incident.createdOnDay < day) {
      return { ...incident, daysOpen: (incident.daysOpen || 0) + 1 };
    }
    return incident;
  });
  return { ...state, activeIncidents };
}

// Bumps the CURRENT month's cost total by `amount` -- the only path that
// actually survives lib/dailyCycle/updateFinance.js's own next accumulate
// pass (its `Number(value) || 0` map over `finance.costs` would silently
// zero out anything shaped as an object, so a labelled `{id, amount}`
// entry is NOT safe here -- see this module's own research). Mirrors the
// exact accumulation pattern useHotelSimulator.js/updateFinance.js already
// use: `costs` is a flat array of plain numbers, one per month, and a
// same-month cost is folded into its last entry.
function debitCurrentMonth(hotelState, amount) {
  const finance = safeObject(hotelState.finance);
  const costs = safeArray(finance.costs).map((value) => Number(value) || 0);
  if (costs.length === 0) costs.push(0);
  const lastIndex = costs.length - 1;
  const nextCosts = costs.map((value, index) => (index === lastIndex ? value + amount : value));
  return { ...hotelState, finance: { ...finance, costs: nextCosts } };
}

// Pays for a repair: debits its real cost from the hotel's own finances,
// then either resolves the incident immediately (`emergency: true`, at
// EMERGENCY_COST_MULTIPLIER the cost) or schedules it ("repairing", to be
// picked up by advanceIncidentRepairs() once `day >= repairEtaDay`).
// Operates on the FULL hotel bundle (`{hotelState, restaurantState, rooms,
// reservations}`), not just hotelState, to match useCareer.js's own
// applyHotelAdjustment()/lib/dashboard/dashboardActions.js's own
// applyQuickAction() contract: a pure (bundle) => nextBundle transform,
// so Dashboard.jsx can call `career.applyHotelAdjustment((bundle) =>
// payForRepair(bundle, incidentId, { emergency, day }))` directly.
// A missing incident, or one that isn't "active" (already repairing or
// resolved -- e.g. a stale double-click), is a no-op: returns the bundle
// unchanged rather than double-charging or corrupting its status.
export function payForRepair(hotelBundle, incidentId, { emergency = false, day } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const incidents = safeArray(hotelState.activeIncidents);
  const incident = incidents.find((item) => item.id === incidentId);
  if (!incident || incident.status !== "active") return bundle;

  const cost = emergency ? Math.round(incident.repairCost * EMERGENCY_COST_MULTIPLIER) : incident.repairCost;
  const nextIncident = emergency
    ? { ...incident, status: "resolved" }
    : { ...incident, status: "repairing", repairEtaDay: day + REPAIR_DELAY_DAYS[incident.severity] };

  const nextHotelState = {
    ...debitCurrentMonth(hotelState, cost),
    activeIncidents: incidents.map((item) => (item.id === incidentId ? nextIncident : item)),
  };

  return { ...bundle, hotelState: nextHotelState };
}

const IncidentEngine = {
  reconcileIncidents,
  advanceIncidentRepairs,
  payForRepair,
  SEVERITY_TIER,
  REPAIR_COST,
  REPAIR_DELAY_DAYS,
  EMERGENCY_COST_MULTIPLIER,
};
export default IncidentEngine;

// Orchestrates the ESG module: given the player's own hotel bundle
// ({ hotelState, restaurantState, rooms, reservations } -- the same
// shape runDailyCycle()/careerEngine.startCareer()/lib/guest/
// guestAdapter.js's createGuestHotelBundle() all share), computes one
// full ESG cycle (énergie -> eau -> déchets -> CO₂ -> coûts -> score ->
// certifications -> diagnostics -> forecast), records it into the ESG
// replay log, and exposes the ESG_ACTION_CATALOG a player can apply to
// their own hotel bundle -- see esgActions.js.
import { safeArray, safeNumber, safeObject } from "../safe";
import { computeCO2Emissions, computeEnergyConsumption, computeEsgCosts, computeEsgScore, computeWasteGenerated, computeWaterConsumption, averageMenuSales } from "./esgCalculations";
import { computeAllCertificationsProgress, nextEligibleCertification } from "./esgCertifications";
import { generateEsgDiagnostics } from "./esgDiagnostics";
import { generateEsgForecast } from "./esgForecast";
import { createEsgState } from "./esgState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyEsgDecision, findEsgAction, ESG_ACTION_CATALOG } from "./esgActions";
import { staffFromCareerState } from "../staff/staffEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// 1-6. Runs one ESG cycle against the player's hotel bundle: pulls
// hotelState.esg/restaurantState.esg (see esgCalculations.js's own
// docstring for why physical units are derived rather than tracked
// directly) plus PMS rooms/reservations and Restaurant's own menu sales
// as a covers proxy, and builds everything an EsgState needs on top of
// them.
export function runEsgCycle({ hotelBundle, staffMorale = null, staffOverload = null, previousState = null, referenceDate = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const hotelEsg = safeObject(hotelState.esg);
  const restaurantEsg = safeObject(restaurantState.esg);
  const rooms = safeArray(bundle.rooms);
  const roomCount = rooms.length;
  const occupiedRoomNights = rooms.filter((room) => String(room.status || "").toLowerCase() !== "libre").length;
  const covers = averageMenuSales(restaurantState.menu);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  const energy = computeEnergyConsumption({ occupiedRoomNights, covers, hotelEsg, restaurantEsg });
  const water = computeWaterConsumption({ occupiedRoomNights, covers, hotelEsg });
  const waste = computeWasteGenerated({ occupiedRoomNights, covers, hotelEsg, restaurantEsg });
  const co2 = computeCO2Emissions({ energyKwh: energy, wasteKg: waste });
  const costs = computeEsgCosts({ energyKwh: energy, waterM3: water, wasteKg: waste });

  const obtainedIds = safeArray(hotelEsg.certifications);
  const score = computeEsgScore({ hotelEsg, restaurantEsg, staffMorale, staffOverload, certificationsCount: obtainedIds.length });

  const certificationMetrics = { score, energy, water, waste, co2, hotelEsg, obtainedIds };
  const certifications = computeAllCertificationsProgress(certificationMetrics);
  const nextCertification = nextEligibleCertification(certificationMetrics);

  const diagnostics = generateEsgDiagnostics({ energy, water, waste, co2, score, staffOverload, roomCount, nextCertification });

  const nextState = createEsgState({
    period: toDateOnly(referenceDate),
    energy,
    water,
    waste,
    co2,
    costs,
    score,
    certifications,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      energy,
      water,
      waste,
      co2,
      score,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateEsgForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- "synchroniser avec careerEngine" (section 1/5):
// builds an ESG cycle straight from a CareerState (see
// lib/career/careerState.js), also folding in the Staff module's current
// morale/overload (for the wellbeing blend and the "surcharge -> bien-
// être" diagnostic) so Career mode feeds the same ESG module a
// standalone (Guest Mode) session uses, without careerEngine.js needing
// to know anything about this module.
export function esgFromCareerState(careerState, previousEsgState = null) {
  const state = safeObject(careerState);
  const staff = state.hotel ? staffFromCareerState(state) : null;
  return runEsgCycle({
    hotelBundle: state.hotel,
    staffMorale: staff?.morale ?? null,
    staffOverload: staff?.overload ?? null,
    previousState: previousEsgState,
  });
}

// Applies an ESG action, resolving certification eligibility from the
// current EsgState first (see esgActions.js's applyEsgDecision() --
// certification eligibility needs the full computed cycle, not just the
// bundle being mutated).
export function applyEsgAction(hotelBundle, actionId, payload, currentEsgState) {
  const state = safeObject(currentEsgState);
  const hotelEsg = safeObject(safeObject(hotelBundle).hotelState).esg;
  const metrics = {
    score: state.score,
    energy: state.energy,
    water: state.water,
    waste: state.waste,
    co2: state.co2,
    hotelEsg,
    obtainedIds: safeArray(hotelEsg?.certifications),
  };
  return applyEsgDecision(hotelBundle, actionId, payload, metrics);
}

// Assembles the full ESG report EsgReport.jsx shows, and adapts
// esgDiagnostics.js's output into the same {type, severity, message}
// shape lib/analytics/analyticsDiagnostics.js uses -- "intégrer les
// diagnostics ESG dans analyticsEngine" (section 5).
export function generateEsgReport(esgState) {
  const state = safeObject(esgState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    energy: state.energy,
    water: state.water,
    waste: state.waste,
    co2: state.co2,
    costs: state.costs,
    score: state.score,
    certifications: safeArray(state.certifications),
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    replay: { totalCycles: safeArray(state.replayLog?.entries).length, entries: safeArray(state.replayLog?.entries) },
  };
}

export function esgDiagnosticsToAnalytics(esgDiagnostics) {
  return safeArray(esgDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

export { ESG_ACTION_CATALOG, findEsgAction };

export const esgEngine = {
  runEsgCycle,
  esgFromCareerState,
  applyEsgAction,
  generateEsgReport,
  esgDiagnosticsToAnalytics,
  findEsgAction,
  ESG_ACTION_CATALOG,
};
export default esgEngine;

// Shape helpers for the Professional Solo mode's own state. A Pro run is
// a self-contained 24-month playthrough -- it embeds its own CareerState
// (see lib/career/careerState.js/careerEngine.js, driven directly by
// proEngine.js rather than through the shared context/CareerContext.jsx
// the regular Solo/Carrière mode uses) so a Pro run never mixes with, or
// gets mixed up with, the player's regular career -- same isolation
// lib/tfe/tfeState.js already established for the TFE Solo mode.
import { safeArray, safeObject } from "../safe";

export function createProState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    proId: source.proId || null,
    playerId: source.playerId || null,
    status: source.status || "not_started", // not_started | active | completed
    hotelConfig: source.hotelConfig || null,
    month: source.month || 0,
    horizonMonths: source.horizonMonths || 24,
    // The embedded CareerState (see lib/career/careerState.js's
    // createCareerState()) -- every business module (Finance/Staff/
    // Marketing/ESG/Housekeeping/RestaurantAdvanced/RmAdvanced/Clients)
    // reads from career.hotel exactly the way they already do for the
    // regular Solo/Carrière mode.
    career: source.career || null,
    phases: safeArray(source.phases),
    // Crises/opportunities: rolling instances, each with a remaining
    // duration -- see proCrises.js/proOpportunities.js.
    crises: safeArray(source.crises),
    opportunities: safeArray(source.opportunities),
    // One audit pass per department per month played -- see proAudits.js.
    audits: safeArray(source.audits),
    missions: safeArray(source.missions),
    objectives: safeArray(source.objectives),
    // One entry per month played -- "performance mensuelle" -- see
    // proEngine.js's buildMonthSnapshot()/playProMonth().
    performanceHistory: safeArray(source.performanceHistory),
    score: source.score || null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    report: source.report || null,
    lastUpdated: source.lastUpdated || null,
  };
}

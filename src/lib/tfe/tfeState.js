// Shape helpers for the TFE module's own state. A TFE run is a
// self-contained 36-month playthrough -- it embeds its own CareerState
// (see lib/career/careerState.js/careerEngine.js, driven directly by
// tfeEngine.js rather than through the shared context/CareerContext.jsx
// the regular Solo/Carrière mode uses) so a TFE run never mixes with, or
// gets mixed up with, the player's regular career.
import { safeArray, safeObject } from "../safe";

export function createTfeState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    tfeId: source.tfeId || null,
    playerId: source.playerId || null,
    status: source.status || "not_started", // not_started | active | completed
    hotelConfig: source.hotelConfig || null,
    month: source.month || 0,
    horizonMonths: source.horizonMonths || 36,
    // The embedded CareerState (see lib/career/careerState.js's
    // createCareerState()) -- every business module (Finance/Staff/
    // Marketing/ESG/Housekeeping) reads from career.hotel exactly the
    // way they already do for the regular Solo/Carrière mode.
    career: source.career || null,
    chapters: safeArray(source.chapters),
    missions: safeArray(source.missions),
    objectives: safeArray(source.objectives),
    // One entry per month played -- "performance mensuelle" (section
    // 4): { month, score, ebitda, occupancy, esgScore, marketingRoi,
    // housekeepingQuality, staffOverload, risks, opportunities }.
    performanceHistory: safeArray(source.performanceHistory),
    score: source.score || null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    report: source.report || null,
    lastUpdated: source.lastUpdated || null,
  };
}

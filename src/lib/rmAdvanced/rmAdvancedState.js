// Shape helpers for the RM Advanced module's own state -- mirrors
// lib/restaurantAdvanced/restaurantAdvancedState.js / lib/clients/clientsState.js.
// Derived from the same PMS bundle every other engine shares (rooms/
// reservations), never owns it: this module only reads them and the
// base RM module's own report (see lib/rm/rmEngine.js) and layers
// compression/displacement/pickup curves/OTA strategy/special pricing/
// diagnostics/forecast on top, then persists that layer (via
// lib/rmAdvancedRepository.js) plus its own replay log.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createRmAdvancedState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    // Occupancy compression per upcoming date, with surbooking/under-
    // occupancy alerts.
    compression: source.compression || { byDate: [], avgCompression: null, highCompressionDates: [], lowOccupancyDates: [] },
    // Revenue lost to a suboptimal segment mix on high-compression dates.
    displacement: source.displacement || { bySegment: {}, totalLoss: null, worstDates: [] },
    // J-30 -> J-0 booking pace curve.
    pickupCurves: source.pickupCurves || { curve: [], momentum: null },
    // OTA vs direct channel mix, commission-adjusted net ADR per channel.
    otaStrategy: source.otaStrategy || { otaShare: null, directShare: null, channels: {}, netAdrByChannel: {} },
    // Event/corporate/premium/long-stay pricing overlays.
    specialPricing: source.specialPricing || { events: [], corporateRate: null, premiumRate: null, longStayRate: null },
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per RM Advanced cycle played -- "replay RM par cycle".
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}

// Shape helpers for the Restaurant Advanced module's own state -- mirrors
// lib/clients/clientsState.js / lib/housekeeping/housekeepingState.js.
// Derived from the restaurant's own menu (see restaurantState.js's
// `menu` array), never owns it: this module only reads the menu and the
// other modules' outputs and layers food cost/popularity/profitability/
// menu engineering/diagnostics/forecast on top, then persists that layer
// (via lib/restaurantAdvancedRepository.js) plus its own replay log.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createRestaurantAdvancedState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    // Food cost %, overall and per category, plus waste/volatility.
    foodCost: source.foodCost || { overall: null, byCategory: {}, wastePct: null, volatilityIndex: null },
    // Per-item popularity (0-100) plus trending/declining lists.
    popularity: source.popularity || { items: [], trending: [], declining: [] },
    // Per-item margin/profitability plus gross/net margin.
    profitability: source.profitability || { items: [], grossMargin: null, netMargin: null, topMargin: [], bottomMargin: [] },
    // Menu Engineering matrix: stars/plowhorses/puzzles/dogs.
    menuEngineering: source.menuEngineering || { items: [], counts: { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 } },
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per cycle played -- "replay F&B par cycle".
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}

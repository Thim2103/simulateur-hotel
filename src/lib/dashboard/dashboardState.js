// Shape helpers for the Dashboard's own persisted state -- separate from
// CareerState (see lib/career/careerState.js): the Dashboard only ever
// *reads* the hotel/restaurant data it needs from CareerState, it never
// owns it. What it does own and persist is the player's view-mode
// preference and the last snapshot it computed (kpis/notifications/
// insights/quickActions), so a reload shows something immediately while
// loadDashboardState() recomputes a fresh one from the current CareerState.
import { safeArray, safeObject } from "../safe";
import { DEFAULT_VIEW_MODE, normalizeViewMode } from "./dashboardViewMode";

export function createDashboardState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    viewMode: normalizeViewMode(source.viewMode || DEFAULT_VIEW_MODE),
    kpis: source.kpis || null,
    notifications: {
      problems: safeArray(source.notifications?.problems),
      alerts: safeArray(source.notifications?.alerts),
      opportunities: safeArray(source.notifications?.opportunities),
    },
    insights: source.insights || null,
    quickActions: safeArray(source.quickActions),
    replaySummary: source.replaySummary || null,
    careerSummary: source.careerSummary || null,
    metadata: safeObject(source.metadata),
    lastUpdated: source.lastUpdated || null,
  };
}

// Only the part of the Dashboard state actually worth persisting across
// reloads: the view-mode preference and a light metadata bag. kpis/
// notifications/insights/replaySummary/careerSummary/quickActions are all
// derived fresh from CareerState every time loadDashboardState() runs, so
// persisting them would just be a staleness risk for no benefit.
export function serializeDashboardPreferences(state) {
  const source = safeObject(state);
  return {
    viewMode: normalizeViewMode(source.viewMode),
    metadata: safeObject(source.metadata),
  };
}

export function deserializeDashboardPreferences(stored) {
  const source = safeObject(stored);
  return {
    viewMode: normalizeViewMode(source.viewMode),
    metadata: safeObject(source.metadata),
  };
}

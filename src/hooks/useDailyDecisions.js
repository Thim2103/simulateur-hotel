import { useMemo } from "react";
import { useDashboard } from "./useDashboard";
import { buildDecisionGroups } from "../lib/dashboard/dailyDecisions";

// Drives DecisionsPanel.jsx: groups useDashboard.js's own quick-action
// catalog by theme (Pricing/Staff/Marketing/Restaurant) and exposes the
// same applyQuickAction() to run one -- no separate action system, see
// lib/dashboard/dailyDecisions.js.
export function useDailyDecisions() {
  const { dashboardState, isRunning, error, applyQuickAction } = useDashboard();

  const groups = useMemo(() => buildDecisionGroups(dashboardState?.quickActions), [dashboardState]);

  return { groups, isRunning, error, applyQuickAction };
}

export default useDailyDecisions;

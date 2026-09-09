import { useCallback } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useDashboard } from "./useDashboard";
import { buildMorningBriefing } from "../lib/dashboard/morningBriefing";

// Drives MorningBriefing.jsx: reuses useDashboard.js's own
// loadDashboardState() (KPIs/notifications/careerSummary, already
// computed from the player's CareerState) and reshapes it into the
// briefing's simpler "what's going on today" shape -- see
// lib/dashboard/morningBriefing.js. No state of its own to persist: the
// briefing is a read-only lens on the same Dashboard data MyHotel shows.
export function useMorningBriefing() {
  const { careerState } = useCareerContext();
  const { dashboardState, isRunning, error, isGuest, loadDashboardState } = useDashboard();

  const loadBriefing = useCallback(
    () => loadDashboardState().then((nextDashboardState) => buildMorningBriefing({ careerState, dashboardState: nextDashboardState })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadDashboardState]
  );

  const briefing = dashboardState ? buildMorningBriefing({ careerState, dashboardState }) : null;

  return { briefing, isRunning, error, isGuest, loadBriefing };
}

export default useMorningBriefing;

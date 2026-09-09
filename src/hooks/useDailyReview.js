import { useCallback } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useDashboard } from "./useDashboard";
import { buildDailyReview } from "../lib/dashboard/dailyReview";

// Drives DailyReview.jsx ("What happened?"), the last step of the daily
// loop (Morning -> MyHotel -> Decisions -> Day -> Results). Same
// "read-only lens over useDashboard.js" pattern as useMorningBriefing.js --
// nothing here re-simulates the day, it only reshapes what nextDay()
// already computed and useDashboard.js already loaded.
export function useDailyReview() {
  const { careerState } = useCareerContext();
  const { dashboardState, isRunning, error, loadDashboardState } = useDashboard();

  const loadReview = useCallback(
    () => loadDashboardState().then((nextDashboardState) => buildDailyReview({ careerState, dashboardState: nextDashboardState })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadDashboardState]
  );

  const review = dashboardState ? buildDailyReview({ careerState, dashboardState }) : null;

  return { review, isRunning, error, loadReview };
}

export default useDailyReview;

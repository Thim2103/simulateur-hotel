import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useCareerContext } from "../../context/CareerContext";
import { useDashboard } from "../../hooks/useDashboard";
import { useProEngine } from "../../hooks/useProEngine";
import { generateFromCareerState, generateFromProState, generateFromReplay } from "./GmMessageGenerator";
import { applyDecision as applyDecisionPure } from "./GmMessageRouter";

const GmDeskContext = createContext(null);

// The GM Desk's own context: one shared inbox (real diagnostics from
// every business module + today's replay events + the Mode Professionnel
// Solo run's crises/opportunities, see GmMessageGenerator.js), and one
// `applyMessageDecision()` that dispatches through the right module's own
// applier (see GmMessageRouter.js) -- the same "one useX() instance shared
// by every consumer" pattern as CareerContext.jsx/AcademyContext.jsx, so
// GmDesk.jsx, a "GM Desk" nav entry and DailyReview.jsx's "Messages reçus
// aujourd'hui" section (see pages/DailyReview.jsx) all read the exact same
// inbox rather than each recomputing (and re-fetching) their own.
//
// The inbox is recomputed fresh from current state every render (like
// AttentionPanel's own attentionItems.js) -- there is no separate,
// persisted message store; a message disappears once the diagnostic/event/
// crisis it came from is resolved, the same "always reflects the truth"
// contract the rest of the Dashboard already has.
export function GmDeskProvider({ children }) {
  const { careerState, applyHotelAdjustment, loadCareerState } = useCareerContext();
  const { proState, applyProAction, loadProState } = useProEngine();
  const { dashboardState, loadDashboardState } = useDashboard();

  useEffect(() => {
    if (!careerState) loadCareerState().catch(() => undefined);
    loadDashboardState().catch(() => undefined);
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = useMemo(() => {
    if (!careerState) return [];
    return [
      ...generateFromCareerState(careerState),
      ...generateFromReplay(dashboardState?.replaySummary?.events),
      ...generateFromProState(proState),
    ];
  }, [careerState, dashboardState, proState]);

  const applyMessageDecision = useCallback(
    async (message, actionId) => {
      const outcome = await applyDecisionPure(message, actionId, { applyHotelAdjustment, applyProAction });
      await loadDashboardState().catch(() => undefined);
      return outcome;
    },
    [applyHotelAdjustment, applyProAction, loadDashboardState]
  );

  const value = useMemo(() => ({ messages, applyMessageDecision }), [messages, applyMessageDecision]);

  return <GmDeskContext.Provider value={value}>{children}</GmDeskContext.Provider>;
}

export function useGmDesk() {
  const context = useContext(GmDeskContext);
  if (!context) {
    throw new Error("useGmDesk() must be used within a <GmDeskProvider> (see ui/gmDesk/GmDeskProvider.jsx).");
  }
  return context;
}

export default GmDeskProvider;

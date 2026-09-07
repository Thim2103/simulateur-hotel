import { createContext, useContext } from "react";
import { useCompetition } from "../hooks/useCompetition";

// A single useCompetition() instance shared across the Competition pages
// -- same fix as ChainContext.jsx/AcademyContext.jsx: without it, each of
// CompetitionDashboard/CompetitionMatch/CompetitionPlayer/CompetitionReview
// would get its own isolated hook state, so a match created on the
// Dashboard would vanish the moment the organizer navigated to it.
const CompetitionContext = createContext(null);

export function CompetitionProvider({ children }) {
  const competition = useCompetition();
  return <CompetitionContext.Provider value={competition}>{children}</CompetitionContext.Provider>;
}

export function useCompetitionContext() {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error("useCompetitionContext() must be used within a <CompetitionProvider> (see App.js).");
  }
  return context;
}

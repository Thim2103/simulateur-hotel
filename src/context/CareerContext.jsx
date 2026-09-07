import { createContext, useContext } from "react";
import { useCareer } from "../hooks/useCareer";

// A single useCareer() instance shared across the 6 Career pages -- same
// fix as ChainContext.jsx/AcademyContext.jsx/CompetitionContext.jsx:
// without it, CareerDashboard/CareerMissions/CareerStory/CareerSkills/
// CareerRewards/CareerNextDay would each get their own isolated hook
// state, so accepting a mission on one page would be invisible on another.
const CareerContext = createContext(null);

export function CareerProvider({ children }) {
  const career = useCareer();
  return <CareerContext.Provider value={career}>{children}</CareerContext.Provider>;
}

export function useCareerContext() {
  const context = useContext(CareerContext);
  if (!context) {
    throw new Error("useCareerContext() must be used within a <CareerProvider> (see App.js).");
  }
  return context;
}

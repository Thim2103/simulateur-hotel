import { createContext, useContext } from "react";
import { useAcademy } from "../hooks/useAcademy";

// A single useAcademy() instance shared across the Academy pages -- same
// fix as ChainContext.jsx: without it, AcademyDashboard/AcademyClass/
// AcademyGroup/AcademyReview would each get their own isolated hook state,
// so a class created on the Dashboard would vanish the moment the teacher
// navigated to it.
const AcademyContext = createContext(null);

export function AcademyProvider({ children }) {
  const academy = useAcademy();
  return <AcademyContext.Provider value={academy}>{children}</AcademyContext.Provider>;
}

export function useAcademyContext() {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error("useAcademyContext() must be used within an <AcademyProvider> (see App.js).");
  }
  return context;
}

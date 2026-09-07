import { createContext, useContext } from "react";
import { useChain } from "../hooks/useChain";

// A single useChain() instance shared across pages. Without this, every
// page calling useChain() directly would get its own isolated hook state --
// hotels added on ChainDashboard would vanish the moment you navigated to
// StaffDashboard, since a hook has no state shared across separate call
// sites on its own. See App.js for where this wraps the routes.
const ChainContext = createContext(null);

export function ChainProvider({ children }) {
  const chain = useChain();
  return <ChainContext.Provider value={chain}>{children}</ChainContext.Provider>;
}

export function useChainContext() {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("useChainContext() must be used within a <ChainProvider> (see App.js).");
  }
  return context;
}

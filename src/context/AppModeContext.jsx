import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "hospitalityLab.appMode";
const MODES = ["normal", "expert"];

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : "normal";
  } catch {
    return "normal";
  }
}

// The app-wide reading level behind the "board game numérique" redesign:
// "normal" (5 simplified spaces, the expert sub-modules hidden from
// navigation) or "expert" (every module/route built up to v1.1.0,
// unlocked exactly as before). Purely a navigation/display preference --
// nothing about the simulation engines changes, and every expert route
// stays mounted and reachable once expert mode is on. Persisted to
// localStorage: a device preference, not game state, so it deliberately
// stays out of CareerState/DashboardState (see dashboardViewMode.js for
// the unrelated casual/expert KPI-label toggle this is not).
//
// The context's own default value (used by any component rendered
// without an AppModeProvider ancestor -- most unit tests, including
// TopBar.test.jsx/AppSidebar.test.jsx and every guest-flow integration
// test that clicks through the full navigation) is "expert", so none of
// them need to know this concept exists. Only the real app (wrapped in
// AppModeProvider, see App.js) defaults a fresh player to "normal".
const AppModeContext = createContext({ appMode: "expert", setAppMode: () => {}, toggleAppMode: () => {} });

export function AppModeProvider({ children }) {
  const [appMode, setAppModeState] = useState(readStoredMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, appMode);
    } catch {
      // best-effort persistence only -- a private/blocked storage just
      // means the choice resets next session, never a broken app.
    }
  }, [appMode]);

  const setAppMode = useCallback((mode) => setAppModeState(MODES.includes(mode) ? mode : "normal"), []);
  const toggleAppMode = useCallback(() => setAppModeState((mode) => (mode === "expert" ? "normal" : "expert")), []);

  return <AppModeContext.Provider value={{ appMode, setAppMode, toggleAppMode }}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  return useContext(AppModeContext);
}

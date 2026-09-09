import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { themeVars } from "./theme";

const STORAGE_KEY = "hospitality-lab:theme";

const GameThemeContext = createContext(null);

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "light";
  } catch {
    // localStorage can throw (private mode, disabled storage) -- default
    // to light rather than crash the app over a cosmetic preference.
    return "light";
  }
}

// Wraps the app (or any subtree) with the game's light/dark theme: writes
// the current theme's CSS custom properties (see theme.js) onto a plain
// <div>, so any component -- Tailwind arbitrary values or the plain CSS in
// ui/animations/animations.css -- can read `var(--gl-*)` without its own
// theme plumbing. Persists the player's choice to localStorage; never
// throws if storage is unavailable (guest mode / private browsing).
export function GameThemeProvider({ children, className }) {
  const [mode, setMode] = useState(readStoredMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Non-fatal: the theme just won't persist across reloads.
    }
  }, [mode]);

  const toggleMode = useCallback(() => setMode((current) => (current === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, toggleMode]);
  const vars = themeVars(mode);

  return (
    <GameThemeContext.Provider value={value}>
      <div data-theme={mode} className={className} style={vars}>
        {children}
      </div>
    </GameThemeContext.Provider>
  );
}

export function useGameTheme() {
  const context = useContext(GameThemeContext);
  if (!context) {
    throw new Error("useGameTheme() must be used within a <GameThemeProvider> (see ui/designSystem/GameThemeProvider.jsx).");
  }
  return context;
}

export default GameThemeProvider;

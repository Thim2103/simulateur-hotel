// Small environment helpers -- kept out of individual components so a
// test can mock/override them without reaching into process.env directly.

// True during `npm start` (CRA sets NODE_ENV to "development"), false in
// a production build. Used by PlayMenu.jsx to show the "Mode invité"
// shortcut during development even before a guest session exists (see
// its own docstring for why a real session is the other trigger).
export function isDevMode() {
  return process.env.NODE_ENV !== "production";
}

// No desktop build exists yet (see MainMenu.jsx's "Quitter" button) --
// this checks for the handful of globals a Tauri/Electron shell would
// inject, so the button stays hidden on every web build without needing
// a dedicated build flag to keep in sync.
export function isDesktopBuild() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__TAURI__ || window.electronAPI || window.process?.versions?.electron);
}

// Light/dark theme tokens for the game UI, expressed as CSS custom
// properties (see GameThemeProvider.jsx, which writes these onto a
// wrapper element) so plain CSS (animations.css) and Tailwind's arbitrary
// `var(--…)` values can both read them without a JS dependency.
export const THEMES = {
  light: {
    "--gl-bg": "#f8fafc",
    "--gl-surface": "#ffffff",
    "--gl-surface-2": "#f1f5f9",
    "--gl-text": "#0f172a",
    "--gl-text-muted": "#64748b",
    "--gl-border": "#e2e8f0",
    "--gl-primary": "#0b1730",
    "--gl-accent": "#e9ab1f",
  },
  dark: {
    "--gl-bg": "#0b1730",
    "--gl-surface": "#122145",
    "--gl-surface-2": "#1b2f5e",
    "--gl-text": "#f8fafc",
    "--gl-text-muted": "#a7b6d9",
    "--gl-border": "#28407a",
    "--gl-primary": "#f8fafc",
    "--gl-accent": "#f5c451",
  },
};

export function themeVars(mode) {
  return THEMES[mode] || THEMES.light;
}

export default THEMES;

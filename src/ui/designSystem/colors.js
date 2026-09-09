// The game's palette -- bleu nuit (deep navy) as the primary ground, or
// (gold) as the "this is special" accent, crème (cream) for light
// surfaces, plus the severity accents AttentionPanel/GameBadge use. Every
// value is a real Tailwind-compatible hex, so components can either use
// these directly (inline style / CSS variables, see theme.js) or the
// matching Tailwind utility class (kept in sync by hand -- see the
// `tw` field on each token).
export const colors = {
  night: {
    950: "#050b18",
    900: "#0b1730",
    800: "#122145",
    700: "#1b2f5e",
    600: "#28407a",
    tw900: "bg-[#0b1730]",
    tw800: "bg-[#122145]",
  },
  gold: {
    400: "#f5c451",
    500: "#e9ab1f",
    600: "#c98a0e",
    tw500: "bg-[#e9ab1f]",
    text500: "text-[#e9ab1f]",
  },
  cream: {
    50: "#fffdf7",
    100: "#fbf3e0",
    200: "#f3e6c4",
    tw50: "bg-[#fffdf7]",
  },
  severity: {
    high: { bg: "#fef2f2", border: "#fecaca", text: "#9f1239", dot: "#e11d48" },
    medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
    low: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", dot: "#10b981" },
  },
  accent: {
    cyan: "#0891b2",
    emerald: "#059669",
    rose: "#e11d48",
  },
};

export default colors;

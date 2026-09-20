// The Bento design system's palette and shape, mirrored from the CSS custom
// properties in index.css (`--ds-*`) for the few places that need a raw value
// in JS (a chart stroke, a test). Components style themselves through the
// `data-tone` attribute (see ui/bento/) so a tone is one word, not a colour.
export const BENTO_COLORS = {
  canvas: "#F8FAFC",
  card: "#FFFFFF",
  success: "#10B981", // succès
  action: "#3B82F6", // éléments cliquables
  vip: "#F59E0B", // alerte / V.I.P.
  mice: "#8B5CF6", // séminaires & événements pro
  danger: "#E11D48",
};

export const BENTO_TONES = ["action", "success", "vip", "mice", "danger", "neutral"];

export const BENTO_RADII = { card: "16px", control: "12px" };

export const BENTO_SHADOW = "0 4px 20px -2px rgba(0, 0, 0, 0.05)";

// A tone the components understand, whatever they were given.
export function toneOf(tone, fallback = "neutral") {
  return BENTO_TONES.includes(tone) ? tone : fallback;
}

export default BENTO_COLORS;

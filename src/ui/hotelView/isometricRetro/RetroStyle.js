// The retro-modern isometric view's own design tokens -- a distinct art
// direction from v3's HotelViewIsometric (functional/technical, thin
// slate palette): saturated-but-soft pastels, crisp 45°-offset drop
// shadows, thin (1-2px) outlines, cartoon-ish rounded proportions. Every
// other component in isometricRetro/ reads from here rather than picking
// its own colours, so the whole view stays visually coherent.
export const RETRO_PALETTE = {
  blue: { fill: "#7dd3fc", stroke: "#0284c7", soft: "#e0f2fe" },
  pink: { fill: "#f9a8d4", stroke: "#db2777", soft: "#fce7f3" },
  yellow: { fill: "#fde68a", stroke: "#d97706", soft: "#fef3c7" },
  green: { fill: "#86efac", stroke: "#16a34a", soft: "#dcfce7" },
  cream: { fill: "#fffaf0", stroke: "#d6c7a1" },
  ink: "#3f3a52",
};

// Room state -> palette entry, the retro view's own mapping (distinct
// from v3's IsoSprites.js -- clean reads "blue" here, not "cyan").
export const ROOM_STATE_PALETTE = {
  clean: RETRO_PALETTE.blue,
  dirty: { fill: "#d6d3c9", stroke: "#78716c", soft: "#e7e5df" },
  occupied: RETRO_PALETTE.yellow,
  cleaning: RETRO_PALETTE.green,
};

// A single, shared drop-shadow -- the "ombres nettes (drop shadow 45°)"
// the spec asks for, one crisp offset shadow rather than a soft/blurred
// one, applied via CSS `filter: drop-shadow(...)` so it follows each
// element's own silhouette (including emoji glyphs) instead of a plain
// box-shadow's rectangle.
export const RETRO_SHADOW = "drop-shadow(3px 4px 0px rgba(63, 58, 82, 0.25))";
export const RETRO_SHADOW_SOFT = "drop-shadow(2px 2px 0px rgba(63, 58, 82, 0.18))";

// Cartoon proportions: a slightly oversized "head" relative to its body --
// RetroCharacter.jsx renders its sprite inside a disc sized by this ratio
// rather than at 1:1, so a small glyph still reads as an expressive
// character instead of a technical marker.
export const RETRO_HEAD_SCALE = 1.35;

export const RETRO_STROKE_WIDTH = "2px";
export const RETRO_RADIUS = "0.75rem"; // rounded-xl equivalent, cartoon-soft corners

const RetroStyle = { RETRO_PALETTE, ROOM_STATE_PALETTE, RETRO_SHADOW, RETRO_SHADOW_SOFT, RETRO_HEAD_SCALE, RETRO_STROKE_WIDTH, RETRO_RADIUS };
export default RetroStyle;

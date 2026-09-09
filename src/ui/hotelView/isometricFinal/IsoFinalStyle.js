// Design tokens for the "Retro-Moderne Premium" isometric view -- the
// exact palette/shadow/proportion values from the Bible Artistique. A
// distinct, self-contained art direction from v2/v3/RetroView: none of
// this file's values are shared with theirs on purpose.
export const PALETTE = {
  glacierBlue: "#A7D3F2",
  coralPink: "#F2A7B1",
  honeyYellow: "#F2D479",
  mintGreen: "#A7F2C4",
  nightBlue: "#1F2A44",
  warmGrey: "#D9D9D9",
  woodBrown: "#A67C52",
  cherryRed: "#E25A5A",
};

export const SHADOW_45 = "rgba(0,0,0,0.25)";
export const SHADOW_SOFT = "rgba(0,0,0,0.15)";
export const HIGHLIGHT_PASTEL = "rgba(255,255,255,0.35)";

// A crisp, offset drop-shadow (not a blurred one) -- "ombres stylisées
// 45°" -- applied via CSS `filter: drop-shadow(...)` so it follows an
// element's own silhouette, emoji glyphs included.
export const SHADOW_FILTER = `drop-shadow(3px 4px 0px ${SHADOW_45})`;
export const SHADOW_FILTER_SOFT = `drop-shadow(2px 2px 0px ${SHADOW_SOFT})`;

export const STROKE_WIDTH = "2px";
export const STROKE_COLOR = PALETTE.nightBlue;

// Cartoon proportions: head = 40% of a character's own height, body =
// 60% -- IsoFinalCharacter.jsx renders its sprite inside a disc sized to
// this ratio of the character's overall box.
export const HEAD_HEIGHT_RATIO = 0.4;
export const BODY_HEIGHT_RATIO = 0.6;

// Room state -> palette entry, this module's own mapping.
export const ROOM_STATE_PALETTE = {
  clean: { fill: PALETTE.glacierBlue, stroke: PALETTE.nightBlue },
  dirty: { fill: PALETTE.warmGrey, stroke: "#78716c" },
  occupied: { fill: PALETTE.honeyYellow, stroke: PALETTE.nightBlue },
  cleaning: { fill: PALETTE.mintGreen, stroke: PALETTE.nightBlue },
};

// A light wood-grain texture (CSS repeating-linear-gradient, no image
// asset) -- "bois : grain léger, teinte brun miel" -- used behind floor
// tiles/desks throughout the view.
export const WOOD_TEXTURE = `repeating-linear-gradient(100deg, ${PALETTE.woodBrown}, ${PALETTE.woodBrown} 6px, #8a6640 6px, #8a6640 8px)`;

// A simple 8x8px tile texture -- "carrelage : carreaux 8×8 px" --
// glacier-blue or warm-grey.
export function tileTexture(color = PALETTE.glacierBlue) {
  return `repeating-linear-gradient(0deg, ${color}, ${color} 7px, ${SHADOW_SOFT} 7px, ${SHADOW_SOFT} 8px), repeating-linear-gradient(90deg, ${color}, ${color} 7px, ${SHADOW_SOFT} 7px, ${SHADOW_SOFT} 8px)`;
}

const IsoFinalStyle = {
  PALETTE,
  SHADOW_45,
  SHADOW_SOFT,
  HIGHLIGHT_PASTEL,
  SHADOW_FILTER,
  SHADOW_FILTER_SOFT,
  STROKE_WIDTH,
  STROKE_COLOR,
  HEAD_HEIGHT_RATIO,
  BODY_HEIGHT_RATIO,
  ROOM_STATE_PALETTE,
  WOOD_TEXTURE,
  tileTexture,
};
export default IsoFinalStyle;

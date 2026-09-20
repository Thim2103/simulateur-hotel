// ONE shared lighting model for the whole scene: every isometric volume
// (terrain, a test block, a building wall, a roof, a window...) derives
// its top/left/right face colors from a single BASE color plus these
// SAME three factors -- never a bespoke shade picked by hand per
// component. This is what guarantees every object in the scene reads as
// lit from the same direction (see this file's own "one light source"
// requirement) instead of each primitive inventing its own shadow.
//
// Conceptual sun direction: from the upper-left, matching sceneShapes.js's
// own face order (a shape's `topFace` is its lit roof/ground plane, its
// `leftFace` catches more light than its `rightFace`, which falls away
// into shadow) -- consistent with SceneTerrainBase.jsx's terrain, which
// already reads this way.
export const LIGHT_FACTORS = {
  top: 1,
  left: 0.78,
  right: 0.55,
  // Two extra tones every material family now carries (see this step's
  // own "système de matériaux" requirement): `highlight` brighter than
  // `top` (a glass reflection strip, a hovered volume's own brightened
  // read), `shadow` darker than `right` (a contact shadow, a recess) --
  // same shared light source, just two more points along it.
  highlight: 1.2,
  shadow: 0.35,
};

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// Multiplies a `#rrggbb` color's RGB channels by `factor` (darkens for
// factor < 1) -- the one place any face-shading math happens.
export function shadeHexColor(hex, factor) {
  const value = String(hex).replace("#", "");
  const r = parseInt(value.substring(0, 2), 16) || 0;
  const g = parseInt(value.substring(2, 4), 16) || 0;
  const b = parseInt(value.substring(4, 6), 16) || 0;
  const toHex = (channel) => clampChannel(channel * factor).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Turns one base material color into the {top, left, right, highlight,
// shadow} quintuple every SceneVolume-shaped primitive needs, using the
// SAME shared light factors above -- the single function every material
// derivation in SceneTokens.js goes through.
export function buildFaceColors(baseHex) {
  return {
    top: shadeHexColor(baseHex, LIGHT_FACTORS.top),
    left: shadeHexColor(baseHex, LIGHT_FACTORS.left),
    right: shadeHexColor(baseHex, LIGHT_FACTORS.right),
    highlight: shadeHexColor(baseHex, LIGHT_FACTORS.highlight),
    shadow: shadeHexColor(baseHex, LIGHT_FACTORS.shadow),
  };
}

const SceneLighting = { LIGHT_FACTORS, shadeHexColor, buildFaceColors };
export default SceneLighting;

// The new world's own design tokens -- the ONE place every dimension,
// color and projection parameter this scene uses is defined. No component
// under scene/ is allowed to hardcode a tile size, a color, or an
// isometric formula of its own (see IsoProjection.js -- SCENE_PROJECTION
// below is the only projection config this whole scene ever passes to
// it). Centralising this is what lets a tile grow (to fit a building, a
// tree, a piece of furniture, a character...) without touching every
// component that draws one.
//
// Visual direction: "stylized isometric management game" -- warm, premium,
// legible, its own language (grass/earth tones, soft depth, no emoji-as-
// graphics, no flat dashboard palette) -- deliberately NOT a re-skin of
// isometricFinal/'s pastel "Retro-Moderne" palette (see IsoFinalStyle.js).
// That module stays untouched; this is a clean break, not an evolution of
// it (see the step's own "ne réutilise pas l'esthétique d'IsoFinal" note).
import { DEFAULT_PROJECTION } from "../engine/IsoProjection";
import { buildFaceColors } from "./SceneLighting";

// A generous 2:1 tile -- big enough to later hold a building, a tree, a
// piece of furniture or a character without everything feeling cramped.
export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 64;
// How many px one full world Z unit (one storey) rises on screen.
export const ELEVATION_HEIGHT = 64;
// How thick the terrain platform's own outer walls read as, in px -- the
// one number that gives the whole terrain its sense of volume.
export const TERRAIN_DEPTH = 48;

// The single projection config every component under scene/ must pass to
// IsoProjection.js -- never invent tile dimensions locally.
export const SCENE_PROJECTION = {
  ...DEFAULT_PROJECTION,
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  elevationHeight: ELEVATION_HEIGHT,
};

// A warm, grass-and-earth palette -- the new world's own visual language.
export const PALETTE = {
  grassTop: "#8FCB6B",
  grassTopAlt: "#7FBE5C",
  grassSide: "#4F7A3B",
  grassSideDark: "#3E6230",
  soilSide: "#8A5A3B",
  soilSideDark: "#6E4530",
  gridLine: "rgba(255, 255, 255, 0.22)",
  gridLineStrong: "rgba(35, 45, 25, 0.28)",
  hoverFill: "rgba(255, 214, 92, 0.55)",
  hoverBorder: "#FFC93C",
  selectedFill: "rgba(66, 200, 196, 0.55)",
  selectedBorder: "#1FA69C",
  occupiedFill: "rgba(64, 48, 38, 0.18)",
  skyTop: "#FDF3DE",
  skyBottom: "#F7E4B8",
  shadow: "rgba(35, 30, 20, 0.35)",
  ink: "#233225",
};

// Building materials -- the ONE place every building/decor color is
// picked. Every entry is a BASE color (a material's own top/lit-most
// tone); `buildFaceColors()` (SceneLighting.js -- the scene's single
// shared light source) derives each one's `top`/`left`/`right` triple, so
// "wall" and "wallSide" (etc.) are never two independently-chosen colors
// that could drift out of sync -- they're the same material lit two ways.
// No component may pick an arbitrary color of its own; every building/
// decor primitive reads its colors from `MATERIAL_FACES` below.
// Nine material FAMILIES (see this step's own "système de matériaux"
// requirement) -- `wood`/`metal`/`glass` are the canonical names every new
// scene/primitives/*.jsx component reads; `windowFrame`/`window`/`door`/
// `trim` stay alongside them (same tones, kept as their own names) purely
// so isometricFinal/'s Étape 6 lobby -- already shipped and visually
// validated -- never has to change a single color reference.
export const MATERIAL_BASE = {
  ground: "#8FCB6B",
  wall: "#F3E4C6", // warm cream stucco
  wood: "#8A5A3B", // furniture, doors, fences, trunks
  roof: "#C0503F", // terracotta
  glass: "#BFE3F0", // pale glass
  metal: "#8C97A6", // lamp posts, hardware
  stone: "#D9CDB8", // steps, paths, rock, floors
  vegetation: "#5DA13F",
  accent: "#3DB9C6", // teal -- awnings, mats, signage highlights
  // Kept for LobbyBuilding.jsx (Étape 6) -- same tones as their canonical
  // equivalent above, under the names it already uses.
  window: "#BFE3F0",
  windowFrame: "#5B4636",
  door: "#8A5A3B",
  trim: "#E8B94F",
};

// `MATERIAL_FACES.<material>` -- every SceneVolume-shaped primitive's own
// `colors` prop. Each material now carries FIVE tones (see this step's own
// "système de matériaux" requirement: base/left/right/highlight/shadow),
// all derived from ONE base color through SceneLighting.js's shared light
// source -- never a color picked by hand per component:
//   .top       -- the brightest, most directly lit face (a roof, a floor).
//   .left      -- SW-facing wall/side (see sceneShapes.js).
//   .right     -- SE-facing wall/side, the most shaded of the three.
//   .highlight -- brighter still than `.top` -- a glass reflection strip,
//                 a hovered volume's own brightened read.
//   .shadow    -- darker than `.right` -- reserved for contact shadows/
//                 recesses that need to read as darker than any lit face.
export const MATERIAL_FACES = Object.fromEntries(Object.entries(MATERIAL_BASE).map(([name, hex]) => [name, buildFaceColors(hex)]));

// SCALE: the ONE place the whole world's proportions are anchored, so a
// future character can walk through today's door, today's door fits
// today's wall, and a piece of furniture fits inside today's room -- see
// this step's own "échelle visuelle" requirement. Every dimension is in
// WORLD units (tile fractions for width/depth, world Z units for height --
// the same units IsoProjection.js/SceneVolume.jsx already use everywhere).
// `BUILDING` below and every scene/primitives/*.jsx component read their
// own default sizes from here -- a number is never typed twice.
export const SCALE = {
  // Not built yet (see this step's own "NE PAS encore ajouter de
  // personnages" rule) -- reserved so every other height below can be
  // defined RELATIVE to it, not guessed independently.
  CHARACTER_HEIGHT: 0.9,
  DOOR_WIDTH: 0.6,
  DOOR_HEIGHT: 1.05, // a little taller than a character -- room to walk through
  WINDOW_WIDTH: 0.42,
  WINDOW_HEIGHT: 0.42,
  WINDOW_SILL_RATIO: 0.42, // fraction of wall height a window's sill sits at
  WALL_HEIGHT: 1.5, // taller than the door -- room for a lintel above it
  WALL_THICKNESS: 0.06,
  ROOF_HEIGHT: 0.55,
  ROOF_OVERHANG: 0.18,
  COLUMN_HEIGHT: 1.3,
  STAIR_STEP_HEIGHT: 0.12,
  STAIR_STEP_DEPTH: 0.22,
  FLOOR_THICKNESS: 0.05,
  FENCE_HEIGHT: 0.5, // low enough to see over -- a boundary marker, not a wall
  FURNITURE_HEIGHT: 0.16, // bench/table seat-ish scale
  DECOR_SCALE: 0.35, // plant/lamp-top/sign scale
  COUNTER_HEIGHT: 0.55, // a reception counter -- waist/chest height, between furniture and a wall
};

// A building's own centralized dimensions (world TILE units for
// width/depth, world Z units for every height) -- every future building
// reads its proportions from here (or its own override merged on top),
// never a number typed directly into a component. `wallThickness` is the
// inset (world units) window/door/trim facets sit at, so they read as
// slightly recessed into the wall rather than floating in front of it.
// Every height/width below is SCALE's own field -- BUILDING is just "the
// lobby's own footprint (width/depth) plus SCALE's shared proportions",
// never a second, independently-chosen set of numbers. `width`/`depth`
// (8x6) are the lobby's own footprint (Étape 7 -- "premier vrai espace
// hôtelier"); a future, differently-shaped room passes its own override.
export const BUILDING = {
  width: 8,
  depth: 6,
  wallHeight: SCALE.WALL_HEIGHT,
  roofHeight: SCALE.ROOF_HEIGHT,
  roofOverhang: SCALE.ROOF_OVERHANG,
  wallThickness: SCALE.WALL_THICKNESS,
  doorWidth: SCALE.DOOR_WIDTH,
  doorHeight: SCALE.DOOR_HEIGHT,
  windowWidth: SCALE.WINDOW_WIDTH,
  windowHeight: SCALE.WINDOW_HEIGHT,
};

const SceneTokens = { TILE_WIDTH, TILE_HEIGHT, ELEVATION_HEIGHT, TERRAIN_DEPTH, SCENE_PROJECTION, PALETTE, MATERIAL_BASE, MATERIAL_FACES, SCALE, BUILDING };
export default SceneTokens;

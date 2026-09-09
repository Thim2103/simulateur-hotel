// The single source of truth for isometric projection math across the
// whole hotel view. Framework-independent (no React) and domain-
// independent (no notion of "room"/"guest"/hôtel anything) on purpose --
// every isometric view this codebase has built so far (v2's flat grid,
// v3's IsoGrid, RetroView's RetroGrid, IsoFinalView's IsoFinalGrid) wrote
// its own copy of the exact same `(x-y, (x+y)/2)` formula; this module
// replaces all of them going forward, starting with isometricFinal/ (see
// IsoFinalGrid.jsx).
//
// Three coordinate systems, kept strictly distinct:
//
//   TILE space   -- the discrete grid: integer {col, row} (+ an integer
//                    `elevation`, a floor/storey index). What a level
//                    designer thinks in ("this room is at column 3 of
//                    floor 2").
//   WORLD space  -- the continuous, framework-agnostic space every scene
//                    entity actually lives in: {x, y, z} (z = height
//                    above the ground plane, in the same units as x/y).
//                    Tile space is just world space rounded to integers;
//                    world space is what lets a character's position be
//                    3.42 tiles along X instead of snapping tile-to-tile,
//                    which is what a later smooth-movement/pathfinding
//                    system will need.
//   SCREEN space -- actual CSS pixels: {x, y}, what gets written into a
//                    `transform`/`left`/`top`.
//
// The projection itself is the classic 2:1 "dimetric" isometric
// projection used by every tile-based iso game (Habbo, RollerCoaster
// Tycoon, Two Point Hospital's UI chrome, etc.):
//
//   screenX = (worldX - worldY) * (tileWidth / 2) * scale + originX
//   screenY = (worldX + worldY) * (tileHeight / 2) * scale
//             - worldZ * elevationHeight * scale + originY
//
// i.e. moving one full tile along world X shifts the screen point right
// and down by half a tile's width/height; moving one full tile along
// world Y shifts it left and down by the same amount; moving up in Z
// shifts it straight up on screen, scaled by `elevationHeight` (a
// separate px-per-unit so vertical storeys don't have to be the same
// visual size as a tile's footprint).
import { safeNumber, safeObject } from "../../../lib/safe";

// Centralised, named parameters -- nothing in this module has a magic
// number baked in outside of these defaults. Every call below accepts an
// override object merged on top of these.
export const DEFAULT_PROJECTION = {
  tileWidth: 64,
  tileHeight: 32,
  elevationHeight: 32,
  originX: 0,
  originY: 0,
  scale: 1,
};

function resolveParams(params) {
  const merged = { ...DEFAULT_PROJECTION, ...safeObject(params) };
  return {
    tileWidth: safeNumber(merged.tileWidth, DEFAULT_PROJECTION.tileWidth),
    tileHeight: safeNumber(merged.tileHeight, DEFAULT_PROJECTION.tileHeight),
    elevationHeight: safeNumber(merged.elevationHeight, DEFAULT_PROJECTION.elevationHeight),
    originX: safeNumber(merged.originX, DEFAULT_PROJECTION.originX),
    originY: safeNumber(merged.originY, DEFAULT_PROJECTION.originY),
    scale: safeNumber(merged.scale, DEFAULT_PROJECTION.scale),
  };
}

// World {x, y, z} -> screen {x, y} pixels. `z` defaults to 0 (ground
// level) so every existing caller that only ever dealt with a flat plane
// (every isometric view built so far) can ignore it entirely.
export function worldToScreen(world, params) {
  const { x, y, z = 0 } = safeObject(world);
  const { tileWidth, tileHeight, elevationHeight, originX, originY, scale } = resolveParams(params);
  return {
    x: (x - y) * (tileWidth / 2) * scale + originX,
    y: (x + y) * (tileHeight / 2) * scale - z * elevationHeight * scale + originY,
  };
}

// Screen {x, y} pixels -> world {x, y, z}. A single 2D screen point does
// not carry enough information to recover 3 world dimensions on its own
// (that's the nature of any orthographic/isometric projection, not a bug
// here) -- the caller must supply the world Z it already knows the point
// sits at (defaults to 0, the ground plane), exactly mirroring how
// `screenToWorld` is used in every real iso engine ("what tile is under
// the mouse, assuming ground level").
export function screenToWorld(screen, params, z = 0) {
  const { x: screenX, y: screenY } = safeObject(screen);
  const { tileWidth, tileHeight, elevationHeight, originX, originY, scale } = resolveParams(params);

  // Undo origin/scale/elevation first, then invert the 2x2 linear system
  // { a = x - y, b = x + y } -> { x = (a+b)/2, y = (b-a)/2 }.
  const a = (scale === 0 ? 0 : (screenX - originX) / scale) / (tileWidth / 2);
  const b = (scale === 0 ? 0 : (screenY - originY) / scale + z * elevationHeight) / (tileHeight / 2);

  return {
    x: (a + b) / 2,
    y: (b - a) / 2,
    z,
  };
}

// Tile {col, row, elevation} -> world {x, y, z}. Tile space is simply
// world space rounded to integers, so this is a direct (not rounded)
// pass-through -- it exists as its own named function so call sites read
// "I'm converting a grid cell to world space", and so a future change
// (e.g. centering a tile's world position at col+0.5 instead of col)
// only has to happen in one place.
export function tileToWorld(tile) {
  const { col, row, elevation = 0 } = safeObject(tile);
  return { x: safeNumber(col, 0), y: safeNumber(row, 0), z: safeNumber(elevation, 0) };
}

// World {x, y, z} -> tile {col, row, elevation}, snapping to the nearest
// integer grid cell.
export function worldToTile(world) {
  const { x, y, z = 0 } = safeObject(world);
  return { col: Math.round(safeNumber(x, 0)), row: Math.round(safeNumber(y, 0)), elevation: Math.round(safeNumber(z, 0)) };
}

// The two compositions every current call site actually needs (every
// existing isometric component only ever went straight from a grid cell
// to a screen pixel, with no intermediate world-space step) -- kept as
// named exports rather than making every caller chain
// `worldToScreen(tileToWorld(tile))` by hand.
export function tileToScreen(tile, params) {
  return worldToScreen(tileToWorld(tile), params);
}

export function screenToTile(screen, params, elevation = 0) {
  return worldToTile(screenToWorld(screen, params, elevation));
}

// A small factory for a scene that always projects with the same
// parameters (the common case -- one hotel view, one tile size) so it
// doesn't have to pass `params` to every single call.
export function createIsoProjection(paramOverrides) {
  const params = resolveParams(paramOverrides);
  return {
    params,
    worldToScreen: (world) => worldToScreen(world, params),
    screenToWorld: (screen, z = 0) => screenToWorld(screen, params, z),
    tileToWorld,
    worldToTile,
    tileToScreen: (tile) => tileToScreen(tile, params),
    screenToTile: (screen, elevation = 0) => screenToTile(screen, params, elevation),
  };
}

const IsoProjection = {
  DEFAULT_PROJECTION,
  worldToScreen,
  screenToWorld,
  tileToWorld,
  worldToTile,
  tileToScreen,
  screenToTile,
  createIsoProjection,
};
export default IsoProjection;

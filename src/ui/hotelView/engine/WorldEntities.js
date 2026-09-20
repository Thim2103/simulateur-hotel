// A minimal, framework- and domain-independent API for "which world tile
// holds which entity" -- placeEntity/removeEntity/canPlaceEntity/
// getEntityAtTile. Deliberately small: this is NOT a construction system
// (no cost, no rotation, no multi-tile footprints, no undo) -- it exists
// purely so a future construction-mode step can be built ON TOP of a
// stable API instead of inventing tile occupancy from scratch. Same
// domain-independence every other engine/ file follows: an "entity" here
// is just a SceneState.js-shaped object with an `id` and a `position`; a
// "tile" is just `{col, row}` (see IsoProjection.js).
//
// Pure functions over a plain entities array (the same array
// SceneState.js's own `entities` field holds) -- nothing here owns state
// itself, so a caller (a future HotelScene.jsx construction mode) stays
// free to put this array wherever its own state already lives.
import { safeArray, safeNumber, safeObject } from "../../../lib/safe";

function toTile(tile) {
  const source = safeObject(tile);
  return { col: safeNumber(source.col, 0), row: safeNumber(source.row, 0) };
}

function sameTile(entity, tile) {
  const position = safeObject(entity?.position);
  return Math.round(safeNumber(position.x, 0)) === tile.col && Math.round(safeNumber(position.y, 0)) === tile.row;
}

// The entity (if any) currently occupying a tile. `null` if the tile is
// free.
export function getEntityAtTile(entities, tile) {
  const target = toTile(tile);
  return safeArray(entities).find((entity) => sameTile(entity, target)) ?? null;
}

// Whether a tile is free to build on: walkable (per an optional Grid.js
// grid) AND not already occupied by another entity.
export function canPlaceEntity(entities, tile, grid) {
  const target = toTile(tile);
  if (grid && typeof grid.isWalkable === "function" && !grid.isWalkable(target.col, target.row)) return false;
  return getEntityAtTile(entities, target) === null;
}

// Returns a NEW entities array with `entity` placed at `tile` (world Z
// preserved from the entity, or 0), or the SAME array unchanged if the
// tile isn't free -- callers can check reference equality to tell whether
// the placement actually happened, same pattern MotionSystem.js's
// `stepEntityMotion()` already uses.
export function placeEntity(entities, entity, tile, grid) {
  const list = safeArray(entities);
  const target = toTile(tile);
  if (!canPlaceEntity(list, target, grid)) return list;

  const source = safeObject(entity);
  const placed = { ...source, position: { x: target.col, y: target.row, z: safeNumber(source.position?.z, 0) } };
  return [...list, placed];
}

// Returns a NEW entities array with the entity of the given id removed
// (or the SAME array unchanged if no such entity exists).
export function removeEntity(entities, entityId) {
  const list = safeArray(entities);
  if (!list.some((entity) => entity.id === entityId)) return list;
  return list.filter((entity) => entity.id !== entityId);
}

const WorldEntities = { getEntityAtTile, canPlaceEntity, placeEntity, removeEntity };
export default WorldEntities;

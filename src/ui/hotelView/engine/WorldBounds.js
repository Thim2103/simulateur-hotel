// Computes the world-space bounding box a camera should consider "the
// world" -- the union of a terrain's own rectangle and every entity's
// footprint (its position PLUS its width/depth, not just its anchor
// point, so a building sitting near an edge is never clipped out of the
// bounds it's supposed to help define). Framework- and domain-independent
// (an "entity" here is just a SceneState.js-shaped `{position, footprint}`
// object) -- same reasoning every other engine/ file follows.
//
// This is deliberately NOT the same thing as "the terrain's own grid
// rectangle" (see HotelScene.jsx's old `WORLD_BOUNDS_XY` constant, used
// directly as Camera.js's fit/clamp bounds) -- that undercounts the moment
// anything is placed outside (or straddling the edge of) the nominal grid.
// `getWorldBounds()` is the one place that aggregates "everything the
// camera should be able to see" into a single rectangle.
import { safeArray, safeNumber, safeObject } from "../../../lib/safe";

// Returns `{minX, maxX, minY, maxY}` in WORLD units -- the exact shape
// Camera.js's own `worldBounds`/`fitWorldToViewport()` already expect.
// `terrainBounds` may be `{minX, maxX, minY, maxY}` (Camera.js's own
// convention) or `null`/omitted. `entities` is any array of
// `{position: {x, y}, footprint: {width, depth}}`-shaped objects (missing
// fields default to 0, never throwing).
export function getWorldBounds({ terrainBounds, entities } = {}) {
  const points = [];

  if (terrainBounds) {
    const bounds = safeObject(terrainBounds);
    const minX = safeNumber(bounds.minX, 0);
    const maxX = safeNumber(bounds.maxX, 0);
    const minY = safeNumber(bounds.minY, 0);
    const maxY = safeNumber(bounds.maxY, 0);
    points.push({ x: minX, y: minY }, { x: maxX, y: maxY });
  }

  for (const entity of safeArray(entities)) {
    const position = safeObject(entity?.position);
    const footprint = safeObject(entity?.footprint);
    const x = safeNumber(position.x, 0);
    const y = safeNumber(position.y, 0);
    const width = safeNumber(footprint.width, 0);
    const depth = safeNumber(footprint.depth, 0);
    points.push({ x, y }, { x: x + width, y: y + depth });
  }

  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

const WorldBounds = { getWorldBounds };
export default WorldBounds;

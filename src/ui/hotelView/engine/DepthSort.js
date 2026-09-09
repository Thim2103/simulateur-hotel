// The single source of truth for isometric render (depth) order. Pure,
// framework- and domain-independent (an "entity" here is just a bounding
// box in world space, see IsoProjection.js for what world space means --
// it has no idea whether it's sorting rooms, characters or furniture).
//
// The problem: in a 2:1 isometric projection, "which of two overlapping
// objects should be drawn on top" cannot be read off their screen
// position alone (screen position is a many-to-one projection of world
// space) -- it has to be decided in world space, using each entity's own
// footprint, before projecting anything. Every isometric view built so
// far in this codebase (v3's IsoGrid, RetroView's RetroGrid, IsoFinalView's
// IsoFinalGrid) sorted only by `col + row` and, worse, several call sites
// (IsoFinalView.jsx among them) never applied that sort at all -- render
// order was just JSX mount order. This module is the one place that
// answers "what order do I draw these in", so no component has to.
//
// An entity is a world-space axis-aligned box:
//   {
//     x, y, z,              -- the box's own "back" corner (the corner
//                               furthest from the camera along each axis)
//     width = 0, depth = 0, -- how far the box extends along +x (width)
//     height = 0,               and +y (depth) from that corner
//   }
// `height` (the box's extent along +z) is accepted for completeness and
// future occlusion work (e.g. "does a tall object's top clip in front of
// a shorter one behind it") but does not participate in the depth key
// below -- for a 2:1 iso camera, an object's vertical extent changes how
// much of it is visible, not whether it's in front of or behind another
// object at a different (x, y).
import { safeArray, safeNumber, safeObject } from "../../../lib/safe";

// The scalar sort key: the world-space coordinate of the entity's own
// FRONT corner (the corner closest to the camera -- `x + width`,
// `y + depth`), summed along both ground axes, plus its elevation `z`.
//
//   - Larger `x + y` (nearer the camera along the ground plane) -> drawn
//     later -> visually in front. This is the standard isometric
//     painter's algorithm.
//   - `width`/`depth` shift a footprint entity's key to its own front
//     edge rather than its back corner, so a wide reception desk starting
//     at the same tile as a thin lamp post is correctly drawn in front of
//     (not tucked behind) anything its own bulk actually reaches past.
//   - Larger `z` (higher elevation) -> drawn later -> visually in front /
//     on top, at equal ground position. This is what lets an entity
//     standing "on top of" another at the same (x, y) (a character on a
//     mezzanine, an item on a table) render above it, and only matters as
//     the deciding factor once x+y is otherwise equal -- see
//     `compareByDepth` below for a documented example.
export function depthKey(entity) {
  const { x, y, z = 0, width = 0, depth = 0 } = safeObject(entity);
  return safeNumber(x, 0) + safeNumber(width, 0) + (safeNumber(y, 0) + safeNumber(depth, 0)) + safeNumber(z, 0);
}

// Pairwise comparator: negative when `a` belongs strictly before `b` in
// draw order (i.e. `a` is behind `b`), positive when after, 0 when they
// tie on depth (caller decides the tie-break -- see `sortEntitiesByDepth`,
// which uses original array order for a fully deterministic result).
export function compareByDepth(a, b) {
  return depthKey(a) - depthKey(b);
}

// Sorts a list of entities into the order they should be drawn in --
// furthest/behind first, nearest/in-front last -- so a caller can just
// `.map()` the result straight into JSX and never think about z-index
// again. Pure: returns a NEW array, never mutates `entities`. Stable:
// entities that tie on depth keep their original relative order (array
// index is the final tie-break), so the result is fully deterministic
// for a given input -- two runs over the same entities always render in
// the same order, regardless of how they were collected.
export function sortEntitiesByDepth(entities) {
  return safeArray(entities)
    .map((entity, index) => ({ entity, index, key: depthKey(entity) }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map(({ entity }) => entity);
}

const DepthSort = { depthKey, compareByDepth, sortEntitiesByDepth };
export default DepthSort;

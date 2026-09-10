// Step 4's demo scenario: a deterministic, technical-prototype path --
// Réception -> (through a one-tile detour around a deliberate obstacle) ->
// Hall -> a room -- built from the real engine pieces (Grid,
// PathfindingService, IsoProjection) rather than a hardcoded list of
// screen positions. This file is allowed to know hotel concepts
// (réception, hall, "which room") -- same allowance EntityFactory.js and
// HotelSceneLayout.js already have -- everything it calls into
// (Grid/PathfindingService/PathFollower) stays completely unaware of any
// of that.
//
// IMPORTANT scope note: this only pathfinds across the ground floor (the
// row réception/hall/etc. already sit on, see HotelSceneLayout.js's own
// `GROUND_ROW`). Getting from the hall to a room on an upper floor isn't
// pathfound yet -- there's no stairs/multi-floor grid modelled -- so that
// final leg is one direct hop, appended after the pathfound route. See the
// step's own "ne modélise pas encore toute la circulation réelle" note.
import { createGrid } from "../engine/Grid";
import { findPath } from "../engine/PathfindingService";
import { tileToWorld } from "../engine/IsoProjection";
import { AMENITY_LAYOUT, GROUND_ROW } from "./HotelSceneLayout";

// A deliberate obstacle sitting between réception (col 0) and hall
// (col 10) on the ground row, forcing a real one-tile detour rather than a
// trivial straight line -- this is what makes the demo actually exercise
// PathfindingService's obstacle avoidance instead of just walking a
// straight corridor.
const DEMO_OBSTACLE = { col: 5, row: GROUND_ROW };

function buildDemoGroundGrid() {
  return createGrid({
    width: 12,
    height: GROUND_ROW + 1, // rows 0..GROUND_ROW: the amenities' own row, plus one row above it to detour through.
    blockedCells: [DEMO_OBSTACLE],
  });
}

// Builds the demo path for one target room entity (see EntityFactory.js
// for its shape). Returns:
//   tilePath  -- the pathfound réception -> hall route, in TILE space
//                (`{col, row}`, see IsoProjection.js), for inspection/
//                display -- this is literally what PathfindingService.js
//                computed, obstacle detour included.
//   waypoints -- the same route converted to WORLD space (via
//                `tileToWorld()`) plus the final réception-corridor -> room
//                hop, ready to hand to PathFollower.beginPath().
export function buildDemoPath(roomEntity) {
  const receptionTile = { col: AMENITY_LAYOUT.reception.col, row: AMENITY_LAYOUT.reception.row };
  const hallTile = { col: AMENITY_LAYOUT.hall.col, row: AMENITY_LAYOUT.hall.row };

  const grid = buildDemoGroundGrid();
  const tilePath = findPath({ start: receptionTile, target: hallTile, grid });
  const worldPath = tilePath.map((tile) => tileToWorld(tile));

  const waypoints = roomEntity ? [...worldPath, { ...roomEntity.position }] : worldPath;

  return { tilePath, waypoints };
}

const DemoPathScenario = { buildDemoPath };
export default DemoPathScenario;

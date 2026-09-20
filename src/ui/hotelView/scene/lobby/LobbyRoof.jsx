import SceneVolume from "../SceneVolume";
import { MATERIAL_FACES, BUILDING } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// The roof: a slightly wider, short box "capping" the walls below it --
// same SceneVolume primitive as everything else, just overhanging by
// `dimensions.roofOverhang` on every side (a classic, cheap way to make a
// silhouette read as "a roof" rather than "the same box, taller") and
// using the `roof` material (terracotta) so it contrasts the walls' `wall`
// material -- both derived from the SAME shared light source (see
// SceneLighting.js), never a one-off color.
//
// Solid on all four sides on purpose, even though the walls below it are
// only solid on two (see LobbyBuilding.jsx's own "vue ouverte" note): the
// roof sits ENTIRELY above `wallHeight`, well clear of anything at floor
// level, so it never occludes the interior -- only the building's own
// silhouette, which is exactly its job.
export function buildLobbyRoofParts(tile, dimensions = BUILDING) {
  const overhang = dimensions.roofOverhang;
  const roofTile = { col: tile.col - overhang, row: tile.row - overhang };
  const footprint = { width: dimensions.width + overhang * 2, depth: dimensions.depth + overhang * 2, height: dimensions.roofHeight };
  return [buildPart("lobby-roof", roofTile, dimensions.wallHeight, footprint, <SceneVolume tile={roofTile} elevation={dimensions.wallHeight} footprint={footprint} colors={MATERIAL_FACES.roof} testId="lobby-roof" />)];
}

const LobbyRoof = { buildLobbyRoofParts };
export default LobbyRoof;

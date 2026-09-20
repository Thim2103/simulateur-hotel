// A tiny shared helper: turns "a component's own tile/elevation/footprint
// + its already-rendered node" into the flat `{id, x, y, z, width, depth,
// height, node}` shape engine/DepthSort.js's `sortEntitiesByDepth()`
// consumes -- the SAME convention HotelScene.jsx/IsoFinalView.jsx already
// flatten SceneState entities into before sorting (see either file's own
// comment on why: DepthSort reads flat `{x,y,z,width,depth,height}`, never
// nested `position`/`footprint`).
//
// Every scene/lobby/*.jsx sub-module (LobbyFloor, LobbyReception,
// LobbyFurniture, LobbyEntrance, LobbyWindows, LobbyRoof) returns an ARRAY
// of these instead of plain JSX, so LobbyBuilding.jsx can merge every sub-
// module's own parts into ONE sort across the WHOLE building -- walls,
// roof, reception, furniture, windows -- and never rely on JSX mount order
// (see this step's own "ne jamais compter sur l'ordre du JSX" rule): a
// piece of furniture standing in front of a wall, or a tree standing in
// front of the lobby, is decided purely by world position, exactly like
// every other entity in this codebase already is.
export function buildPart(id, tile, elevation, footprint, node) {
  return {
    id,
    x: tile.col,
    y: tile.row,
    z: elevation,
    width: footprint.width,
    depth: footprint.depth,
    height: footprint.height,
    node,
  };
}

const lobbyParts = { buildPart };
export default lobbyParts;

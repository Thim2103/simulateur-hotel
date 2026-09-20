import { IsoWindow } from "../primitives/IsoArchitecture";
import { BUILDING } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// A handful of windows (see this step's own "ne pas multiplier les
// détails" rule) on the lobby's two SOLID walls -- north (back) and west
// (side), see LobbyBuilding.jsx's own "vue ouverte" note for why those are
// the two walls that stay solid. Reuses scene/primitives/IsoArchitecture.js's
// own `IsoWindow` (frame + glass) directly -- no bespoke window shape for
// the lobby.
export function buildLobbyWindowParts(tile, dimensions = BUILDING) {
  const sillElevation = dimensions.wallHeight * 0.42;
  const footprintAlongWidth = { width: dimensions.windowWidth, depth: dimensions.wallThickness, height: dimensions.windowHeight };
  const footprintAlongDepth = { width: dimensions.wallThickness, depth: dimensions.windowWidth, height: dimensions.windowHeight };

  const northLeftTile = { col: tile.col + 1.2, row: tile.row };
  const northRightTile = { col: tile.col + dimensions.width - 1.2 - dimensions.windowWidth, row: tile.row };
  const westTile = { col: tile.col, row: tile.row + dimensions.depth / 2 - dimensions.windowWidth / 2 };

  return [
    buildPart("lobby-window-north-left", northLeftTile, sillElevation, footprintAlongWidth, (
      <IsoWindow tile={northLeftTile} elevation={sillElevation} width={dimensions.windowWidth} height={dimensions.windowHeight} depth={dimensions.wallThickness} testId="lobby-window-north-left" />
    )),
    buildPart("lobby-window-north-right", northRightTile, sillElevation, footprintAlongWidth, (
      <IsoWindow tile={northRightTile} elevation={sillElevation} width={dimensions.windowWidth} height={dimensions.windowHeight} depth={dimensions.wallThickness} testId="lobby-window-north-right" />
    )),
    buildPart("lobby-window-west", westTile, sillElevation, footprintAlongDepth, (
      <IsoWindow tile={westTile} elevation={sillElevation} width={dimensions.wallThickness} height={dimensions.windowHeight} depth={dimensions.windowWidth} testId="lobby-window-west" />
    )),
  ];
}

const LobbyWindows = { buildLobbyWindowParts };
export default LobbyWindows;

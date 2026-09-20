import { IsoFloor } from "../primitives/IsoArchitecture";
import { SCALE } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// The lobby's own interior floor -- a single flat `IsoFloor` spanning the
// whole footprint, `stone` (a warm, premium finish -- see this step's own
// "palette premium et chaleureuse" note), sitting just above the terrain
// so it reads as a real interior surface rather than bare grass.
export function buildLobbyFloorParts(tile, dimensions) {
  const { width, depth } = dimensions;
  const footprint = { width, depth, height: SCALE.FLOOR_THICKNESS };
  return [buildPart("lobby-floor", tile, 0, footprint, <IsoFloor tile={tile} width={width} depth={depth} material="stone" testId="lobby-floor" />)];
}

const LobbyFloor = { buildLobbyFloorParts };
export default LobbyFloor;

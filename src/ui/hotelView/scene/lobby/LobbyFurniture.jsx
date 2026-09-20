import SceneVolume from "../SceneVolume";
import { IsoFloor } from "../primitives/IsoArchitecture";
import { IsoChair, IsoTable, IsoLamp, IsoPlant } from "../primitives/IsoDecor";
import { MATERIAL_FACES } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// A small waiting/seating area in the lobby's OPEN central-east zone --
// a rug, a small table, two chairs, a lamp -- plus one corner plant and a
// little luggage. FEW HIGH-VALUE DETAILS (same rule as Étape 6's own
// entrance decor): enough to make the room feel inhabited and read as a
// real hotel lobby, not a furniture showroom. Every piece is one of
// scene/primitives/IsoDecor.jsx's own catalog components -- no bespoke
// shape invented for the lobby.
export function buildLobbyFurnitureParts(tile, dimensions) {
  const parts = [];

  // The seating group sits away from both the entrance's own walkway
  // (south-center) and the reception's own counter (north), in the open
  // area a guest would naturally linger in while waiting.
  const rugTile = { col: tile.col + dimensions.width - 3, row: tile.row + 2 };
  const rugFootprint = { width: 2, depth: 2, height: 0.02 };
  parts.push(buildPart("lobby-rug", rugTile, 0.005, rugFootprint, <IsoFloor tile={rugTile} elevation={0.005} width={2} depth={2} material="accent" testId="lobby-rug" />));

  const tableTile = { col: rugTile.col + 0.8, row: rugTile.row + 0.8 };
  parts.push(buildPart("lobby-table", tableTile, 0, { width: 0.4, depth: 0.4, height: 0.14 }, <IsoTable tile={tableTile} testId="lobby-table" />));

  const chair1Tile = { col: tableTile.col - 0.5, row: tableTile.row + 0.1 };
  parts.push(buildPart("lobby-chair-1", chair1Tile, 0, { width: 0.22, depth: 0.22, height: 0.2 }, <IsoChair tile={chair1Tile} testId="lobby-chair-1" />));

  const chair2Tile = { col: tableTile.col + 0.5, row: tableTile.row + 0.4 };
  parts.push(buildPart("lobby-chair-2", chair2Tile, 0, { width: 0.22, depth: 0.22, height: 0.2 }, <IsoChair tile={chair2Tile} testId="lobby-chair-2" />));

  const lampTile = { col: rugTile.col + 1.7, row: rugTile.row + 1.7 };
  parts.push(buildPart("lobby-lamp", lampTile, 0, { width: 0.08, depth: 0.08, height: 0.75 }, <IsoLamp tile={lampTile} testId="lobby-lamp" />));

  // A plant in the far interior corner (opposite the entrance's own
  // flanking plants, see LobbyEntrance.jsx).
  const plantTile = { col: tile.col + dimensions.width - 0.8, row: tile.row + 0.6 };
  parts.push(buildPart("lobby-plant", plantTile, 0, { width: 0.3, depth: 0.3, height: 0.4 }, <IsoPlant tile={plantTile} testId="lobby-plant" />));

  // A little piece of luggage near the entrance -- a small case-shaped box.
  const luggageTile = { col: tile.col + dimensions.width / 2 + 0.9, row: tile.row + dimensions.depth - 1.3 };
  const luggageFootprint = { width: 0.22, depth: 0.16, height: 0.18 };
  parts.push(
    buildPart(
      "lobby-luggage",
      luggageTile,
      0,
      luggageFootprint,
      <SceneVolume tile={luggageTile} elevation={0} footprint={luggageFootprint} colors={MATERIAL_FACES.wood} testId="lobby-luggage" groundShadow />
    )
  );

  return parts;
}

const LobbyFurniture = { buildLobbyFurnitureParts };
export default LobbyFurniture;

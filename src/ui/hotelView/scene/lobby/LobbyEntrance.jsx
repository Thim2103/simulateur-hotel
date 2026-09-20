import SceneVolume from "../SceneVolume";
import { IsoPlant, IsoLamp } from "../primitives/IsoDecor";
import { MATERIAL_FACES, BUILDING } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// The lobby's entrance: a shallow perron/step, two flanking pillars, an
// awning, a signage plaque, a welcome mat and two flanking plants -- every
// one of them a SceneVolume (or, for the plants, an IsoPlant), positioned
// from the SAME world tile/footprint convention as the walls and roof
// (never a screen offset), centered on the building's own south edge --
// the OPEN side (see LobbyBuilding.jsx's own "vue ouverte" note: this
// lobby's south and east sides carry no solid wall panel at all, only this
// entrance cluster's own silhouette cues) -- so NO literal door leaf here:
// an isolated door slab floating in an open gap would read as a mistake,
// not an entrance. Steps + pillars + awning + sign + plants + mat is
// enough to make "this is the entrance" immediately legible (see this
// step's own "silhouette > détail" rule) without needing a wall around it.
//
// FEW HIGH-VALUE DETAILS on purpose (see Étape 6's own rule, still true
// here): each piece earns its place.
export function buildLobbyEntranceParts(tile, dimensions = BUILDING) {
  const frontRow = tile.row + dimensions.depth;
  const centerCol = tile.col + dimensions.width / 2;
  const doorLeft = centerCol - dimensions.doorWidth / 2;
  const doorRight = centerCol + dimensions.doorWidth / 2;

  const stepTile = { col: doorLeft - 0.2, row: frontRow };
  const stepFootprint = { width: dimensions.doorWidth + 0.4, depth: 0.22, height: 0.12 };

  const pillarLeftTile = { col: doorLeft - 0.22, row: frontRow - dimensions.wallThickness };
  const pillarRightTile = { col: doorRight + 0.1, row: frontRow - dimensions.wallThickness };
  const pillarFootprint = { width: 0.12, depth: 0.12, height: dimensions.doorHeight + 0.3 };

  const awningTile = { col: doorLeft - 0.35, row: frontRow - 0.15 };
  const awningFootprint = { width: dimensions.doorWidth + 0.7, depth: 0.4, height: 0.12 };

  const signTile = { col: doorRight + 0.35, row: frontRow - dimensions.wallThickness };
  const signFootprint = { width: 0.14, depth: 0.06, height: 0.32 };

  const matTile = { col: doorLeft, row: frontRow + 0.24 };
  const matFootprint = { width: dimensions.doorWidth, depth: 0.12, height: 0.02 };

  const plantLeftTile = { col: doorLeft - 0.55, row: frontRow + 0.15 };
  const plantRightTile = { col: doorRight + 0.55, row: frontRow + 0.15 };

  const lampTile = { col: tile.col - 0.4, row: frontRow + 0.1 };

  return [
    buildPart(
      "lobby-entrance-step",
      stepTile,
      0,
      stepFootprint,
      <SceneVolume tile={stepTile} elevation={0} footprint={stepFootprint} colors={MATERIAL_FACES.stone} testId="lobby-entrance-step" />
    ),
    buildPart(
      "lobby-entrance-pillar-left",
      pillarLeftTile,
      0,
      pillarFootprint,
      <SceneVolume tile={pillarLeftTile} elevation={0} footprint={pillarFootprint} colors={MATERIAL_FACES.trim} testId="lobby-entrance-pillar" />
    ),
    buildPart(
      "lobby-entrance-pillar-right",
      pillarRightTile,
      0,
      pillarFootprint,
      <SceneVolume tile={pillarRightTile} elevation={0} footprint={pillarFootprint} colors={MATERIAL_FACES.trim} testId="lobby-entrance-pillar" />
    ),
    buildPart(
      "lobby-entrance-awning",
      awningTile,
      dimensions.doorHeight + 0.15,
      awningFootprint,
      <SceneVolume tile={awningTile} elevation={dimensions.doorHeight + 0.15} footprint={awningFootprint} colors={MATERIAL_FACES.accent} testId="lobby-entrance-awning" />
    ),
    buildPart(
      "lobby-entrance-sign",
      signTile,
      0.55,
      signFootprint,
      <SceneVolume tile={signTile} elevation={0.55} footprint={signFootprint} colors={MATERIAL_FACES.trim} testId="lobby-entrance-sign" title="Hospitality Lab" ariaLabel="Enseigne de l'hôtel" />
    ),
    buildPart(
      "lobby-entrance-mat",
      matTile,
      0,
      matFootprint,
      <SceneVolume tile={matTile} elevation={0} footprint={matFootprint} colors={MATERIAL_FACES.accent} testId="lobby-entrance-mat" />
    ),
    buildPart("lobby-entrance-plant-left", plantLeftTile, 0, { width: 1, depth: 1, height: 1 }, <IsoPlant tile={plantLeftTile} testId="lobby-entrance-plant-left" />),
    buildPart("lobby-entrance-plant-right", plantRightTile, 0, { width: 1, depth: 1, height: 1 }, <IsoPlant tile={plantRightTile} testId="lobby-entrance-plant-right" />),
    buildPart("lobby-entrance-lamp", lampTile, 0, { width: 0.16, depth: 0.16, height: 0.87 }, <IsoLamp tile={lampTile} testId="lobby-entrance-lamp" />),
  ];
}

const LobbyEntrance = { buildLobbyEntranceParts };
export default LobbyEntrance;

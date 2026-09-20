import SceneVolume from "../SceneVolume";
import { MATERIAL_FACES, SCALE } from "../SceneTokens";
import { buildPart } from "./lobbyParts";

// The reception: the lobby's own functional heart -- a counter against
// the BACK (north) wall, facing the entrance, with a small shelving unit
// behind it, a bright "screen" standing in for a workstation monitor, and
// a lamp. Immediately identifiable (a long counter is a universal "this is
// where you check in" signal) and positioned along the circulation path a
// guest walking in from the south entrance would naturally follow.
//
// Carries its own future identity (`type: "reception"`, a click ->
// front-office interaction) via `testId`/`ariaLabel` only -- NOT wired to
// any business module yet (see this step's own "ne branche pas encore le
// module métier" rule). `interactionState`/`onMouseEnter`/`onMouseLeave`/
// `onClick` are forwarded from LobbyBuilding.jsx so the counter shares the
// same hover/selected treatment as the rest of the building.
export function buildLobbyReceptionParts(tile, dimensions, interaction = {}) {
  const { interactionState = "default", onMouseEnter, onMouseLeave, onClick } = interaction;
  const counterWidth = Math.min(3, dimensions.width - 2);
  const counterTile = { col: tile.col + dimensions.width / 2 - counterWidth / 2, row: tile.row + 0.3 };
  const counterFootprint = { width: counterWidth, depth: 0.5, height: SCALE.COUNTER_HEIGHT };

  const shelfTile = { col: counterTile.col, row: tile.row + 0.02 };
  const shelfFootprint = { width: counterWidth, depth: 0.18, height: 0.55 };

  const screenTile = { col: counterTile.col + counterWidth - 0.35, row: counterTile.row + 0.15 };
  const screenFootprint = { width: 0.2, depth: 0.04, height: 0.22 };

  const lampTile = { col: counterTile.col + 0.25, row: counterTile.row + 0.15 };
  const lampFootprint = { width: 0.1, depth: 0.1, height: 0.2 };

  return [
    buildPart(
      "lobby-reception-counter",
      counterTile,
      0,
      counterFootprint,
      <SceneVolume
        tile={counterTile}
        elevation={0}
        footprint={counterFootprint}
        colors={MATERIAL_FACES.wood}
        testId="lobby-reception-counter"
        interactionState={interactionState}
        title="Réception"
        ariaLabel="Réception"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
    ),
    buildPart(
      "lobby-reception-shelf",
      shelfTile,
      SCALE.COUNTER_HEIGHT,
      shelfFootprint,
      <SceneVolume tile={shelfTile} elevation={SCALE.COUNTER_HEIGHT} footprint={shelfFootprint} colors={MATERIAL_FACES.wood} testId="lobby-reception-shelf" />
    ),
    buildPart(
      "lobby-reception-screen",
      screenTile,
      SCALE.COUNTER_HEIGHT,
      screenFootprint,
      <SceneVolume tile={screenTile} elevation={SCALE.COUNTER_HEIGHT} footprint={screenFootprint} colors={MATERIAL_FACES.glass} testId="lobby-reception-screen" />
    ),
    buildPart(
      "lobby-reception-lamp",
      lampTile,
      SCALE.COUNTER_HEIGHT,
      lampFootprint,
      <SceneVolume tile={lampTile} elevation={SCALE.COUNTER_HEIGHT} footprint={lampFootprint} colors={MATERIAL_FACES.accent} testId="lobby-reception-lamp" />
    ),
  ];
}

const LobbyReception = { buildLobbyReceptionParts };
export default LobbyReception;

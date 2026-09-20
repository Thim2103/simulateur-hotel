import { Fragment } from "react";
import { sortEntitiesByDepth } from "../../engine/DepthSort";
import SceneVolume from "../SceneVolume";
import { IsoWall, IsoColumn } from "../primitives/IsoArchitecture";
import { PALETTE, BUILDING } from "../SceneTokens";
import { buildFaceColors } from "../SceneLighting";
import { buildPart } from "./lobbyParts";
import { buildLobbyFloorParts } from "./LobbyFloor";
import { buildLobbyRoofParts } from "./LobbyRoof";
import { buildLobbyEntranceParts } from "./LobbyEntrance";
import { buildLobbyWindowParts } from "./LobbyWindows";
import { buildLobbyReceptionParts } from "./LobbyReception";
import { buildLobbyFurnitureParts } from "./LobbyFurniture";

const HOVER_HALO_COLORS = buildFaceColors(PALETTE.hoverBorder);
const SELECTED_HALO_COLORS = buildFaceColors(PALETTE.selectedBorder);

// The hotel's first REAL space, not just a reference building: the lobby
// (8x6 tiles, see SceneTokens.js's own `BUILDING`) -- entrance, reception,
// an open central area, a small seating group, circulation toward a
// future corridor. Composed entirely from primitives (see
// scene/primitives/IsoArchitecture.jsx/IsoDecor.jsx) and this folder's own
// small sub-modules, every one of which returns an array of "parts"
// (`lobbyParts.js`'s own `{id, x, y, z, width, depth, height, node}`
// shape) rather than JSX directly -- walls, roof, windows, reception,
// furniture and the entrance are all merged into ONE
// `sortEntitiesByDepth()` call below and rendered in THAT order, so a
// piece of furniture, a wall, and a window are never drawn "whichever
// order the JSX happened to list them in" (see this step's own "ne jamais
// compter sur l'ordre du JSX" rule) -- exactly the same depth-sort
// discipline HotelScene.jsx/IsoFinalView.jsx already apply to their own
// top-level entities, just scoped to this one building's own sub-parts.
// The floor (and the hover/selected halo) are the one deliberate
// exception -- see this function's own "backdropParts" comment below for
// why a whole-room flat surface can't go through the same sort as
// everything sitting on it.
//
// OPEN CORNER, not four closed walls (see this step's own "vue ouverte
// pour le gameplay" requirement): only the NORTH (back) and WEST (side)
// walls are solid -- the two edges sceneShapes.js's projection NEVER
// draws as a visible face from this camera angle in the first place (a
// box only ever shows its top + south + east faces in this projection),
// so they can never occlude the interior. The SOUTH (entrance) and EAST
// (future corridor) edges carry no wall panel at all -- only corner
// columns for silhouette continuity -- leaving the reception, furniture,
// and circulation fully visible from the default camera angle. This is a
// simple, deliberately building-specific solution (see the step's own "ne
// crée pas encore un système général complexe de cutaway" instruction),
// but the PATTERN (solid back walls, open front, corner columns, parts
// merged into one depth sort) is the one any future room can repeat.
export default function LobbyBuilding({ tile, dimensions = BUILDING, isHovered = false, isSelected = false, onHover, onSelect }) {
  const { width, depth, wallHeight } = dimensions;
  const interactionState = isSelected ? "selected" : isHovered ? "hovered" : "default";
  const halo = isSelected ? SELECTED_HALO_COLORS : isHovered ? HOVER_HALO_COLORS : null;

  // The floor (and, when shown, the selection/hover halo) are rendered
  // FIRST, unconditionally, OUTSIDE the depth sort below -- exactly how
  // HotelScene.jsx renders SceneTerrainBase before its own depth-sorted
  // entity list. A flat surface spanning the WHOLE room has a depth key
  // dominated by its own far corner (`x + width`, `y + depth`), which is
  // LARGER than most furniture sitting well inside it -- sorted "normally"
  // it would draw (and thus visually sit) ON TOP of that furniture, which
  // is backwards for a floor. A floor/backdrop is always the bottom-most
  // layer by definition, never a participant in the depth sort.
  const backdropParts = [];
  if (halo) {
    const haloTile = { col: tile.col - 0.15, row: tile.row - 0.15 };
    const haloFootprint = { width: width + 0.3, depth: depth + 0.3, height: 0.03 };
    backdropParts.push(buildPart("lobby-halo", haloTile, 0, haloFootprint, <SceneVolume tile={haloTile} elevation={0} footprint={haloFootprint} colors={halo} testId="lobby-halo" />));
  }
  backdropParts.push(...buildLobbyFloorParts(tile, dimensions));

  const parts = [];

  // North (back) wall -- full length, the building's own primary click/
  // hover target (the single largest, most obviously "the building"
  // surface), so it alone carries the interaction handlers.
  const northWallFootprint = { width, depth: dimensions.wallThickness, height: wallHeight };
  parts.push(
    buildPart(
      "lobby-wall-north",
      tile,
      0,
      northWallFootprint,
      <IsoWall
        tile={tile}
        width={width}
        height={wallHeight}
        interactionState={interactionState}
        testId="lobby-wall-north"
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        onClick={() => onSelect?.()}
      />
    )
  );

  // West (side) wall -- full length, same wall material, no separate
  // interaction target (the north wall's own handlers already cover "the
  // building").
  const westWallFootprint = { width: dimensions.wallThickness, depth, height: wallHeight };
  parts.push(buildPart("lobby-wall-west", tile, 0, westWallFootprint, <IsoWall tile={tile} width={dimensions.wallThickness} depth={depth} height={wallHeight} interactionState={interactionState} testId="lobby-wall-west" />));

  // Corner columns at all four corners -- silhouette continuity on the
  // OPEN south/east sides without ever occluding them (see this file's own
  // docstring above).
  [
    { dx: 0, dy: 0, id: "nw" },
    { dx: width, dy: 0, id: "ne" },
    { dx: 0, dy: depth, id: "sw" },
    { dx: width, dy: depth, id: "se" },
  ].forEach(({ dx, dy, id }) => {
    const columnTile = { col: tile.col + dx - 0.06, row: tile.row + dy - 0.06 };
    const columnFootprint = { width: 0.12, depth: 0.12, height: wallHeight + 0.1 };
    parts.push(buildPart(`lobby-column-${id}`, columnTile, 0, columnFootprint, <IsoColumn tile={columnTile} height={wallHeight + 0.1} material="stone" testId={`lobby-column-${id}`} />));
  });

  parts.push(...buildLobbyRoofParts(tile, dimensions));
  parts.push(...buildLobbyWindowParts(tile, dimensions));
  parts.push(...buildLobbyEntranceParts(tile, dimensions));
  parts.push(...buildLobbyReceptionParts(tile, dimensions, { interactionState, onMouseEnter: () => onHover?.(true), onMouseLeave: () => onHover?.(false), onClick: () => onSelect?.() }));
  parts.push(...buildLobbyFurnitureParts(tile, dimensions));

  const sorted = sortEntitiesByDepth(parts);

  return (
    <div data-testid="lobby-building" data-selected={isSelected ? "true" : "false"} data-hovered={isHovered ? "true" : "false"} aria-label="Lobby de l'hôtel">
      {backdropParts.map((part) => (
        <Fragment key={part.id}>{part.node}</Fragment>
      ))}
      {sorted.map((part) => (
        <Fragment key={part.id}>{part.node}</Fragment>
      ))}
    </div>
  );
}

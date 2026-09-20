import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { TILE_WIDTH, TILE_HEIGHT, SCENE_PROJECTION, PALETTE } from "./SceneTokens";

const DIAMOND_CLIP_PATH = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

export function tileKey(col, row) {
  return `${col},${row}`;
}

// One discrete, interactive grid cell -- a diamond exactly TILE_WIDTH x
// TILE_HEIGHT (see SceneTokens.js), positioned via IsoProjection at its
// own tile's world center. Purely a hover/select/occupied VISUAL layer on
// top of SceneTerrainBase.jsx's own continuous platform -- it draws no
// depth of its own (that's the terrain's job).
function SceneGridCell({ col, row, isHovered, isSelected, isOccupied, onHoverTile, onSelectTile }) {
  const screen = worldToScreen(tileToWorld({ col, row }), SCENE_PROJECTION);

  let background = "transparent";
  let borderColor = PALETTE.gridLine;
  if (isOccupied) background = PALETTE.occupiedFill;
  if (isHovered) {
    background = PALETTE.hoverFill;
    borderColor = PALETTE.hoverBorder;
  }
  if (isSelected) {
    background = PALETTE.selectedFill;
    borderColor = PALETTE.selectedBorder;
  }

  return (
    <div
      data-testid="scene-grid-cell"
      data-col={col}
      data-row={row}
      data-hovered={isHovered ? "true" : "false"}
      data-selected={isSelected ? "true" : "false"}
      data-occupied={isOccupied ? "true" : "false"}
      role="button"
      aria-label={`Cellule ${col}, ${row}`}
      className="absolute"
      style={{
        left: screen.x - TILE_WIDTH / 2,
        top: screen.y - TILE_HEIGHT / 2,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        clipPath: DIAMOND_CLIP_PATH,
        background,
        border: `1px solid ${borderColor}`,
        cursor: "pointer",
        transition: "background-color 120ms ease",
      }}
      onMouseEnter={() => onHoverTile?.({ col, row })}
      onMouseLeave={() => onHoverTile?.(null)}
      onClick={() => onSelectTile?.({ col, row })}
    />
  );
}

// The terrain's own "grille discrète" + interaction layer: one
// SceneGridCell per tile in `bounds` (`{minCol, maxCol, minRow, maxRow}`,
// the SAME bounds SceneTerrainBase.jsx renders). Knows only tiles
// (`{col, row}`) and generic hover/select/occupied state -- no rooms, no
// clients, no staff, no revenue (see this file's own place in the
// architecture: scene/, not a hotel-domain module).
export default function SceneGrid({ bounds, hoveredTile, selectedTile, occupiedTiles, onHoverTile, onSelectTile }) {
  const { minCol, maxCol, minRow, maxRow } = bounds;
  const cells = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      cells.push({ col, row });
    }
  }

  return (
    <>
      {cells.map(({ col, row }) => (
        <SceneGridCell
          key={tileKey(col, row)}
          col={col}
          row={row}
          isHovered={hoveredTile?.col === col && hoveredTile?.row === row}
          isSelected={selectedTile?.col === col && selectedTile?.row === row}
          isOccupied={occupiedTiles?.has ? occupiedTiles.has(tileKey(col, row)) : false}
          onHoverTile={onHoverTile}
          onSelectTile={onSelectTile}
        />
      ))}
    </>
  );
}

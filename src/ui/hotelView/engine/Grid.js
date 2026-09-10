// A minimal walkable-cell grid: the ONLY concepts it knows are cells,
// bounds, and which cells are blocked. No notion of "room"/"wall"/"hotel"
// anything -- a future step can mark cells blocked because a building sits
// there, but this module itself never knows why a cell is blocked, only
// that it is. Same domain-independence reasoning as every other engine/
// file (IsoProjection.js, DepthSort.js, MotionSystem.js, SceneLoop.js).
//
// Cells are addressed in TILE space, `{col, row}` -- see IsoProjection.js's
// own docstring for what that means; this grid is the thing
// PathfindingService.js searches over.
import { safeArray, safeNumber } from "../../../lib/safe";

function cellKey(col, row) {
  return `${col},${row}`;
}

// `width`/`height` are optional: omitting either leaves that axis
// unbounded (only `blockedCells` and negative coordinates limit it) --
// useful for a quick test grid that doesn't care about an edge.
// `blockedCells` is a list of `{col, row}` cells that are NOT walkable
// (e.g. a wall, a piece of furniture) -- everything else is walkable by
// default.
export function createGrid({ width = null, height = null, blockedCells = [] } = {}) {
  const blocked = new Set(safeArray(blockedCells).map((cell) => cellKey(safeNumber(cell?.col, 0), safeNumber(cell?.row, 0))));

  function inBounds(col, row) {
    if (width !== null && (col < 0 || col >= width)) return false;
    if (height !== null && (row < 0 || row >= height)) return false;
    return true;
  }

  return {
    width,
    height,
    isWalkable(col, row) {
      if (!inBounds(col, row)) return false;
      return !blocked.has(cellKey(col, row));
    },
    isBlocked(col, row) {
      return blocked.has(cellKey(col, row));
    },
    block(col, row) {
      blocked.add(cellKey(col, row));
    },
    unblock(col, row) {
      blocked.delete(cellKey(col, row));
    },
  };
}

const Grid = { createGrid };
export default Grid;

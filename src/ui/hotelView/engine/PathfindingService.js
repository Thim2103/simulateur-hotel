// Finds a walkable path between two grid cells. Pure, framework- and
// domain-independent -- it only ever knows `{col, row}` cells, a grid's
// own `isWalkable(col, row)` (see Grid.js), a start and a target. It has
// no idea whether the cells it's routing through are a hotel corridor, a
// warehouse aisle, or anything else -- same reasoning IsoProjection.js,
// DepthSort.js, MotionSystem.js and SceneLoop.js already followed.
//
// BFS, not A*: every step costs exactly 1 (a plain walkable/blocked grid,
// no terrain weights), so BFS already finds the shortest path and does it
// with less code and no heuristic to get subtly wrong -- A*'s only real
// advantage (steering the search with a heuristic) buys nothing on a
// uniform-cost grid this small. If a future step introduces weighted
// terrain, this is the one function that would need to grow a priority
// queue and a heuristic.
//
// Movement is 4-directional (N/E/S/W) -- deterministic neighbour order
// keeps the result reproducible for the same grid/start/target, which the
// step's own "chemin déterministe" demo scenario and this file's tests
// both rely on.
import { safeNumber, safeObject } from "../../../lib/safe";

const NEIGHBOR_OFFSETS = [
  { dCol: 0, dRow: -1 }, // north
  { dCol: 1, dRow: 0 }, // east
  { dCol: 0, dRow: 1 }, // south
  { dCol: -1, dRow: 0 }, // west
];

function cellKey(col, row) {
  return `${col},${row}`;
}

function toCell(point) {
  const source = safeObject(point);
  return { col: safeNumber(source.col, 0), row: safeNumber(source.row, 0) };
}

// Returns the path from `start` to `target` as an array of `{col, row}`
// points, INCLUDING both endpoints, in walking order -- `[start, ..., target]`.
// Returns `[start]` when start and target are the same cell (nothing to
// walk). Returns `[]` when no walkable path exists (target unreachable,
// unwalkable, or out of the grid's bounds).
export function findPath({ start, target, grid }) {
  const from = toCell(start);
  const to = toCell(target);

  if (!grid || typeof grid.isWalkable !== "function") return [];
  if (!grid.isWalkable(from.col, from.row) || !grid.isWalkable(to.col, to.row)) return [];

  if (from.col === to.col && from.row === to.row) return [from];

  const startKey = cellKey(from.col, from.row);
  const targetKey = cellKey(to.col, to.row);

  const visited = new Set([startKey]);
  const cameFrom = new Map(); // childKey -> parent cell
  const queue = [from];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const currentKey = cellKey(current.col, current.row);

    if (currentKey === targetKey) {
      return reconstructPath(cameFrom, current, from);
    }

    for (const { dCol, dRow } of NEIGHBOR_OFFSETS) {
      const next = { col: current.col + dCol, row: current.row + dRow };
      const nextKey = cellKey(next.col, next.row);
      if (visited.has(nextKey)) continue;
      if (!grid.isWalkable(next.col, next.row)) continue;

      visited.add(nextKey);
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  // Queue exhausted without ever reaching `target`: unreachable.
  return [];
}

function reconstructPath(cameFrom, endCell, startCell) {
  const path = [endCell];
  let currentKey = cellKey(endCell.col, endCell.row);

  while (currentKey !== cellKey(startCell.col, startCell.row)) {
    const parent = cameFrom.get(currentKey);
    path.push(parent);
    currentKey = cellKey(parent.col, parent.row);
  }

  return path.reverse();
}

const PathfindingService = { findPath };
export default PathfindingService;

// A deliberately light pathfinding layer for the isometric view's ambient
// characters -- a plain breadth-first search on a small grid (the same
// 12x12 IsoGrid.jsx uses), which is both simpler and plenty fast enough
// than A* for a hotel floor plan with a handful of obstacles; there's no
// weighted terrain here to need A*'s heuristic over BFS's guaranteed
// shortest path on an unweighted grid. No pathfinding library, no
// pre-baked navmesh -- "pas de complexité AAA" per the spec.
import { safeArray } from "../../../lib/safe";

function key(col, row) {
  return `${col},${row}`;
}

function neighbors(col, row) {
  return [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ];
}

// `grid`: { width, height, blocked?: Set<"col,row"> }. Returns the
// shortest path from `start` to `end` as an array of {col, row} steps
// (start included, end included), or `[start]` if `end` is unreachable or
// already equal to `start`.
export function findPathIso(start, end, grid = {}) {
  const width = grid.width ?? 12;
  const height = grid.height ?? 12;
  const blocked = grid.blocked instanceof Set ? grid.blocked : new Set();

  const inBounds = (col, row) => col >= 0 && col < width && row >= 0 && row < height;
  const isOpen = (col, row) => inBounds(col, row) && !blocked.has(key(col, row));

  if (!start || !end) return start ? [start] : [];
  if (start.col === end.col && start.row === end.row) return [start];
  if (!isOpen(end.col, end.row)) return [start];

  const startKey = key(start.col, start.row);
  const cameFrom = new Map([[startKey, null]]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.col === end.col && current.row === end.row) break;

    for (const next of neighbors(current.col, current.row)) {
      const nextKey = key(next.col, next.row);
      if (!isOpen(next.col, next.row) || cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  const endKey = key(end.col, end.row);
  if (!cameFrom.has(endKey)) return [start];

  const path = [];
  let stepKey = endKey;
  let step = end;
  while (step) {
    path.unshift(step);
    step = cameFrom.get(stepKey);
    stepKey = step ? key(step.col, step.row) : null;
  }
  return path;
}

// A light visual nudge, not real physics: any characters sharing the
// exact same cell get a small, stable fractional offset (by index within
// the colliding group) so they render as visibly distinct sprites instead
// of one hiding the other. Returns a NEW array; never mutates input.
export function avoidCollisions(characters) {
  const groups = new Map();
  safeArray(characters).forEach((character) => {
    const cellKey = key(character.col, character.row);
    if (!groups.has(cellKey)) groups.set(cellKey, []);
    groups.get(cellKey).push(character);
  });

  return safeArray(characters).map((character) => {
    const group = groups.get(key(character.col, character.row));
    const positionInGroup = group.indexOf(character);
    if (group.length <= 1) return character;
    const offset = (positionInGroup - (group.length - 1) / 2) * 0.35;
    return { ...character, col: character.col + offset, row: character.row };
  });
}

const IsoPathfinding = { findPathIso, avoidCollisions };
export default IsoPathfinding;

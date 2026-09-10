import { findPath } from "./PathfindingService";
import { createGrid } from "./Grid";

describe("PathfindingService / findPath", () => {
  it("finds a direct path on an open grid", () => {
    const grid = createGrid({ width: 5, height: 1 });
    const path = findPath({ start: { col: 0, row: 0 }, target: { col: 4, row: 0 }, grid });
    expect(path).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 4, row: 0 },
    ]);
  });

  it("routes around an obstacle", () => {
    // A 3-wide corridor with the middle cell of the direct row blocked --
    // the only way through is a one-cell detour above or below it.
    const grid = createGrid({
      width: 3,
      height: 3,
      blockedCells: [{ col: 1, row: 1 }],
    });
    const path = findPath({ start: { col: 1, row: 0 }, target: { col: 1, row: 2 }, grid });

    expect(path[0]).toEqual({ col: 1, row: 0 });
    expect(path[path.length - 1]).toEqual({ col: 1, row: 2 });
    // Never steps on the blocked cell.
    expect(path).not.toContainEqual({ col: 1, row: 1 });
    // Shortest possible detour: 5 cells (1 more than the blocked 4-cell
    // direct route would have been).
    expect(path).toHaveLength(5);
  });

  it("returns an empty path when the target is unreachable", () => {
    // The target is fully walled in.
    const grid = createGrid({
      width: 3,
      height: 3,
      blockedCells: [
        { col: 0, row: 1 },
        { col: 1, row: 0 },
        { col: 1, row: 1 },
        { col: 1, row: 2 },
        { col: 2, row: 1 },
      ],
    });
    const path = findPath({ start: { col: 0, row: 0 }, target: { col: 2, row: 2 }, grid });
    expect(path).toEqual([]);
  });

  it("returns an empty path when the target itself is not walkable", () => {
    const grid = createGrid({ blockedCells: [{ col: 5, row: 5 }] });
    const path = findPath({ start: { col: 0, row: 0 }, target: { col: 5, row: 5 }, grid });
    expect(path).toEqual([]);
  });

  it("start === target: returns a single-point path", () => {
    const grid = createGrid();
    const path = findPath({ start: { col: 3, row: 3 }, target: { col: 3, row: 3 }, grid });
    expect(path).toEqual([{ col: 3, row: 3 }]);
  });

  it("finds a path with several waypoints (an L-shaped turn)", () => {
    const grid = createGrid({ width: 4, height: 4 });
    const path = findPath({ start: { col: 0, row: 0 }, target: { col: 2, row: 2 }, grid });
    // Manhattan distance 4 -> 5-cell shortest path, start and target included.
    expect(path).toHaveLength(5);
    expect(path[0]).toEqual({ col: 0, row: 0 });
    expect(path[path.length - 1]).toEqual({ col: 2, row: 2 });
    // Every consecutive pair is a single orthogonal step.
    for (let i = 1; i < path.length; i += 1) {
      const dCol = Math.abs(path[i].col - path[i - 1].col);
      const dRow = Math.abs(path[i].row - path[i - 1].row);
      expect(dCol + dRow).toBe(1);
    }
  });

  it("never throws on malformed input", () => {
    expect(() => findPath({})).not.toThrow();
    expect(findPath({})).toEqual([]);
    expect(() => findPath({ start: null, target: null, grid: null })).not.toThrow();
  });
});

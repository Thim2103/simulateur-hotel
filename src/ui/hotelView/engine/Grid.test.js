import { createGrid } from "./Grid";

describe("Grid", () => {
  it("every cell is walkable by default", () => {
    const grid = createGrid();
    expect(grid.isWalkable(0, 0)).toBe(true);
    expect(grid.isWalkable(-5, 42)).toBe(true);
  });

  it("blockedCells are not walkable", () => {
    const grid = createGrid({ blockedCells: [{ col: 2, row: 3 }] });
    expect(grid.isWalkable(2, 3)).toBe(false);
    expect(grid.isBlocked(2, 3)).toBe(true);
    expect(grid.isWalkable(2, 4)).toBe(true);
  });

  it("block()/unblock() toggle a cell at runtime", () => {
    const grid = createGrid();
    expect(grid.isWalkable(1, 1)).toBe(true);
    grid.block(1, 1);
    expect(grid.isWalkable(1, 1)).toBe(false);
    grid.unblock(1, 1);
    expect(grid.isWalkable(1, 1)).toBe(true);
  });

  it("respects width/height bounds when given", () => {
    const grid = createGrid({ width: 3, height: 2 });
    expect(grid.isWalkable(0, 0)).toBe(true);
    expect(grid.isWalkable(2, 1)).toBe(true);
    expect(grid.isWalkable(3, 0)).toBe(false);
    expect(grid.isWalkable(0, 2)).toBe(false);
    expect(grid.isWalkable(-1, 0)).toBe(false);
  });
});

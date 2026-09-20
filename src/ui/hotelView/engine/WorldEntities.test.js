import { getEntityAtTile, canPlaceEntity, placeEntity, removeEntity } from "./WorldEntities";
import { createGrid } from "./Grid";

function entityAt(id, col, row) {
  return { id, type: "test", position: { x: col, y: row, z: 0 } };
}

describe("WorldEntities / getEntityAtTile", () => {
  it("finds the entity occupying a tile", () => {
    const entities = [entityAt("a", 1, 1), entityAt("b", 2, 2)];
    expect(getEntityAtTile(entities, { col: 2, row: 2 }).id).toBe("b");
  });

  it("returns null for a free tile", () => {
    expect(getEntityAtTile([entityAt("a", 1, 1)], { col: 5, row: 5 })).toBeNull();
  });
});

describe("WorldEntities / canPlaceEntity", () => {
  it("allows placement on a free, walkable tile", () => {
    expect(canPlaceEntity([], { col: 3, row: 3 })).toBe(true);
  });

  it("forbids placement on an already-occupied tile", () => {
    expect(canPlaceEntity([entityAt("a", 3, 3)], { col: 3, row: 3 })).toBe(false);
  });

  it("forbids placement on a non-walkable grid cell", () => {
    const grid = createGrid({ blockedCells: [{ col: 4, row: 4 }] });
    expect(canPlaceEntity([], { col: 4, row: 4 }, grid)).toBe(false);
    expect(canPlaceEntity([], { col: 5, row: 5 }, grid)).toBe(true);
  });
});

describe("WorldEntities / placeEntity", () => {
  it("adds the entity at the given tile", () => {
    const next = placeEntity([], { id: "tree-1", type: "decoration" }, { col: 2, row: 3 });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "tree-1", position: { x: 2, y: 3, z: 0 } });
  });

  it("returns the SAME array, unchanged, when the tile is occupied", () => {
    const entities = [entityAt("a", 1, 1)];
    const next = placeEntity(entities, { id: "b" }, { col: 1, row: 1 });
    expect(next).toBe(entities);
  });

  it("returns the SAME array, unchanged, when the tile is not walkable", () => {
    const grid = createGrid({ blockedCells: [{ col: 0, row: 0 }] });
    const entities = [];
    const next = placeEntity(entities, { id: "a" }, { col: 0, row: 0 }, grid);
    expect(next).toBe(entities);
  });
});

describe("WorldEntities / removeEntity", () => {
  it("removes the entity with the given id", () => {
    const entities = [entityAt("a", 1, 1), entityAt("b", 2, 2)];
    const next = removeEntity(entities, "a");
    expect(next).toEqual([entityAt("b", 2, 2)]);
  });

  it("returns the SAME array, unchanged, when the id doesn't exist", () => {
    const entities = [entityAt("a", 1, 1)];
    expect(removeEntity(entities, "does-not-exist")).toBe(entities);
  });
});

import { getWorldBounds } from "./WorldBounds";

function entityAt(x, y, width = 1, depth = 1) {
  return { position: { x, y, z: 0 }, footprint: { width, depth, height: 1 } };
}

describe("WorldBounds / getWorldBounds", () => {
  it("uses the terrain rectangle alone when there are no entities", () => {
    const bounds = getWorldBounds({ terrainBounds: { minX: 0, maxX: 10, minY: 0, maxY: 8 } });
    expect(bounds).toEqual({ minX: 0, maxX: 10, minY: 0, maxY: 8 });
  });

  it("expands the bounds to include an entity's full footprint, not just its anchor point", () => {
    const bounds = getWorldBounds({
      terrainBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      entities: [entityAt(9, 9, 3, 3)], // extends to (12, 12) -- past the terrain
    });
    expect(bounds.maxX).toBe(12);
    expect(bounds.maxY).toBe(12);
  });

  it("does not shrink below the terrain when every entity sits well inside it", () => {
    const bounds = getWorldBounds({
      terrainBounds: { minX: 0, maxX: 20, minY: 0, maxY: 20 },
      entities: [entityAt(5, 5)],
    });
    expect(bounds).toEqual({ minX: 0, maxX: 20, minY: 0, maxY: 20 });
  });

  it("an entity with a negative position extends the minimum bound", () => {
    const bounds = getWorldBounds({
      terrainBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      entities: [entityAt(-2, -3, 1, 1)],
    });
    expect(bounds.minX).toBe(-2);
    expect(bounds.minY).toBe(-3);
  });

  it("works from entities alone, with no terrain given", () => {
    const bounds = getWorldBounds({ entities: [entityAt(1, 1), entityAt(5, 5, 2, 2)] });
    expect(bounds).toEqual({ minX: 1, maxX: 7, minY: 1, maxY: 7 });
  });

  it("never throws on empty/malformed input", () => {
    expect(() => getWorldBounds()).not.toThrow();
    expect(getWorldBounds()).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    expect(() => getWorldBounds({ entities: [{}, null, { position: {} }] })).not.toThrow();
  });
});

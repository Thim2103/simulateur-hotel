import { depthKey, compareByDepth, sortEntitiesByDepth } from "./DepthSort";

describe("depthKey", () => {
  test("is x + y for a zero-footprint, ground-level entity", () => {
    expect(depthKey({ x: 3, y: 4, z: 0 })).toBe(7);
  });

  test("adds width/depth to shift the key to the entity's own front corner", () => {
    expect(depthKey({ x: 0, y: 0, width: 2, depth: 1 })).toBe(3);
  });

  test("adds z as a tie-break for elevation", () => {
    expect(depthKey({ x: 1, y: 1, z: 5 })).toBe(7);
  });

  test("defaults every missing field to 0", () => {
    expect(depthKey({})).toBe(0);
  });
});

describe("compareByDepth", () => {
  test("A in front of B (A further along x+y) returns positive", () => {
    const a = { x: 5, y: 5 };
    const b = { x: 1, y: 1 };
    expect(compareByDepth(a, b)).toBeGreaterThan(0);
  });

  test("B in front of A returns negative", () => {
    const a = { x: 1, y: 1 };
    const b = { x: 5, y: 5 };
    expect(compareByDepth(a, b)).toBeLessThan(0);
  });

  test("equal depth returns 0", () => {
    expect(compareByDepth({ x: 2, y: 3 }, { x: 3, y: 2 })).toBe(0);
  });
});

describe("sortEntitiesByDepth", () => {
  test("draws far entities first, near entities last (painter's algorithm)", () => {
    const near = { id: "near", x: 5, y: 5 };
    const far = { id: "far", x: 0, y: 0 };
    const mid = { id: "mid", x: 2, y: 2 };
    expect(sortEntitiesByDepth([near, far, mid]).map((e) => e.id)).toEqual(["far", "mid", "near"]);
  });

  test("entities on the same iso row keep their original relative order (stable, deterministic)", () => {
    const a = { id: "a", x: 1, y: 0 };
    const b = { id: "b", x: 0, y: 1 };
    const c = { id: "c", x: -2, y: 3 };
    expect(sortEntitiesByDepth([a, b, c]).map((e) => e.id)).toEqual(["a", "b", "c"]);
    // Same set, different input order -> same relative order preserved,
    // proving the result depends on input order for ties, not on object
    // identity/insertion into some hidden global structure.
    expect(sortEntitiesByDepth([c, b, a]).map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  test("a wide/deep entity is drawn in front of a thin one that starts at the same tile but doesn't reach as far", () => {
    const wideDesk = { id: "desk", x: 0, y: 0, width: 3, depth: 2 };
    const thinLamp = { id: "lamp", x: 0, y: 0, width: 0, depth: 0 };
    expect(sortEntitiesByDepth([wideDesk, thinLamp]).map((e) => e.id)).toEqual(["lamp", "desk"]);
  });

  test("at equal ground position, the higher (larger z) entity is drawn in front / on top", () => {
    const onFloor = { id: "floor-item", x: 2, y: 2, z: 0 };
    const onTable = { id: "table-item", x: 2, y: 2, z: 1 };
    expect(sortEntitiesByDepth([onTable, onFloor]).map((e) => e.id)).toEqual(["floor-item", "table-item"]);
  });

  test("a lower entity further along x+y can still be drawn in front of a higher one closer to the origin", () => {
    // Elevation is only the *tie-break*, not a primary axis -- a
    // ground-level entity standing well in front of the camera still
    // draws after (in front of) an elevated one much further back.
    const closeGround = { id: "close-ground", x: 10, y: 10, z: 0 };
    const farElevated = { id: "far-elevated", x: 0, y: 0, z: 5 };
    expect(sortEntitiesByDepth([farElevated, closeGround]).map((e) => e.id)).toEqual(["far-elevated", "close-ground"]);
  });

  test("does not mutate its input array or the entities in it", () => {
    const entities = [{ id: "a", x: 5, y: 5 }, { id: "b", x: 0, y: 0 }];
    const snapshot = JSON.parse(JSON.stringify(entities));
    sortEntitiesByDepth(entities);
    expect(entities).toEqual(snapshot);
  });

  test("edge cases: empty list, single entity, entities missing width/depth/z", () => {
    expect(sortEntitiesByDepth([])).toEqual([]);
    expect(sortEntitiesByDepth([{ id: "only", x: 1, y: 1 }]).map((e) => e.id)).toEqual(["only"]);
    expect(sortEntitiesByDepth([{ id: "bare", x: 1, y: 1 }, { id: "full", x: 1, y: 0, z: 0, width: 0, depth: 1 }]).map((e) => e.id)).toEqual([
      "bare",
      "full",
    ]);
  });
});

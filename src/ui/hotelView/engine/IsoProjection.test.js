import {
  DEFAULT_PROJECTION,
  worldToScreen,
  screenToWorld,
  tileToWorld,
  worldToTile,
  tileToScreen,
  screenToTile,
  createIsoProjection,
} from "./IsoProjection";

describe("worldToScreen", () => {
  test("(0,0,0) projects to the origin, with no params override", () => {
    expect(worldToScreen({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
  });

  test("moving one full tile along world X only (Y fixed at 0)", () => {
    const { tileWidth, tileHeight } = DEFAULT_PROJECTION;
    expect(worldToScreen({ x: 1, y: 0 })).toEqual({ x: tileWidth / 2, y: tileHeight / 2 });
  });

  test("moving one full tile along world Y only (X fixed at 0)", () => {
    const { tileWidth, tileHeight } = DEFAULT_PROJECTION;
    expect(worldToScreen({ x: 0, y: 1 })).toEqual({ x: -tileWidth / 2, y: tileHeight / 2 });
  });

  test("X/Y consistency: moving diagonally (x=y) only ever changes screenY, never screenX", () => {
    expect(worldToScreen({ x: 3, y: 3 }).x).toBe(0);
    expect(worldToScreen({ x: 3, y: 3 }).y).toBeGreaterThan(0);
    expect(worldToScreen({ x: 7, y: 7 }).x).toBe(0);
  });

  test("moving along Z only raises the screen point (smaller screenY), X unaffected", () => {
    const ground = worldToScreen({ x: 2, y: 2, z: 0 });
    const raised = worldToScreen({ x: 2, y: 2, z: 1 });
    expect(raised.x).toBe(ground.x);
    expect(raised.y).toBeLessThan(ground.y);
    expect(ground.y - raised.y).toBe(DEFAULT_PROJECTION.elevationHeight);
  });

  test("respects custom tileWidth/tileHeight/elevationHeight/origin/scale", () => {
    const params = { tileWidth: 100, tileHeight: 50, elevationHeight: 20, originX: 10, originY: 20, scale: 2 };
    // (x - y) * (tileWidth/2) * scale + originX = (2-1)*50*2 + 10 = 110
    // (x + y) * (tileHeight/2) * scale - z*elevationHeight*scale + originY = (2+1)*25*2 - 1*20*2 + 20 = 150 - 40 + 20 = 130
    expect(worldToScreen({ x: 2, y: 1, z: 1 }, params)).toEqual({ x: 110, y: 130 });
  });

  test("multiple tiles at once stay linear (no accumulated drift)", () => {
    const { tileWidth, tileHeight } = DEFAULT_PROJECTION;
    expect(worldToScreen({ x: 5, y: 0 })).toEqual({ x: (5 * tileWidth) / 2, y: (5 * tileHeight) / 2 });
    expect(worldToScreen({ x: 0, y: 5 })).toEqual({ x: -(5 * tileWidth) / 2, y: (5 * tileHeight) / 2 });
  });
});

describe("screenToWorld (inverse projection)", () => {
  test("is the exact inverse of worldToScreen for a variety of points, default params", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
      { x: 0, y: 4, z: 0 },
      { x: 3, y: 5, z: 0 },
      { x: -2, y: 7, z: 0 },
    ];
    points.forEach((world) => {
      const screen = worldToScreen(world);
      expect(screenToWorld(screen)).toEqual(world);
    });
  });

  test("is the exact inverse of worldToScreen at several non-zero Z values, given the same Z back", () => {
    [0, 1, 2.5, -1].forEach((z) => {
      const world = { x: 3, y: 2, z };
      const screen = worldToScreen(world);
      expect(screenToWorld(screen, undefined, z)).toEqual(world);
    });
  });

  test("is the exact inverse under custom params (tile size, origin, scale)", () => {
    const params = { tileWidth: 80, tileHeight: 40, elevationHeight: 24, originX: 50, originY: -30, scale: 1.5 };
    const world = { x: 6, y: 4, z: 2 };
    const screen = worldToScreen(world, params);
    expect(screenToWorld(screen, params, 2)).toEqual(world);
  });

  test("defaults z to 0 when not supplied", () => {
    const screen = worldToScreen({ x: 3, y: 1, z: 0 });
    expect(screenToWorld(screen)).toEqual({ x: 3, y: 1, z: 0 });
  });
});

describe("tileToWorld / worldToTile", () => {
  test("tileToWorld is a direct (unrounded) pass-through of col/row/elevation", () => {
    expect(tileToWorld({ col: 3, row: 5 })).toEqual({ x: 3, y: 5, z: 0 });
    expect(tileToWorld({ col: 3, row: 5, elevation: 2 })).toEqual({ x: 3, y: 5, z: 2 });
  });

  test("tileToWorld preserves fractional tile coordinates (for future smooth movement)", () => {
    expect(tileToWorld({ col: 2.5, row: 1.25 })).toEqual({ x: 2.5, y: 1.25, z: 0 });
  });

  test("worldToTile rounds to the nearest integer cell", () => {
    expect(worldToTile({ x: 2.4, y: 1.6, z: 0.5 })).toEqual({ col: 2, row: 2, elevation: 1 });
    expect(worldToTile({ x: -0.6, y: 0, z: 0 })).toEqual({ col: -1, row: 0, elevation: 0 });
  });

  test("worldToTile(tileToWorld(tile)) is the identity for integer tiles", () => {
    const tile = { col: 4, row: -2, elevation: 3 };
    expect(worldToTile(tileToWorld(tile))).toEqual(tile);
  });
});

describe("tileToScreen / screenToTile", () => {
  test("tileToScreen composes tileToWorld and worldToScreen", () => {
    expect(tileToScreen({ col: 1, row: 0 })).toEqual(worldToScreen({ x: 1, y: 0, z: 0 }));
  });

  test("screenToTile is the inverse of tileToScreen for integer tiles", () => {
    const tile = { col: 5, row: 3, elevation: 0 };
    const screen = tileToScreen(tile);
    expect(screenToTile(screen)).toEqual(tile);
  });
});

describe("createIsoProjection", () => {
  test("returns bound helpers that always use the given params", () => {
    const projection = createIsoProjection({ tileWidth: 76, tileHeight: 38 });
    expect(projection.params.tileWidth).toBe(76);
    expect(projection.tileToScreen({ col: 1, row: 0 })).toEqual({ x: 38, y: 19 });
    expect(projection.screenToTile(projection.tileToScreen({ col: 2, row: 1 }))).toEqual({ col: 2, row: 1, elevation: 0 });
  });
});

import {
  createCamera,
  worldToScreen,
  screenToWorld,
  panBy,
  panByScreenDelta,
  zoomTo,
  zoomBy,
  zoomAtViewportPoint,
  focusOnWorldPoint,
  resetCamera,
  getViewportTransform,
} from "./Camera";

// A deliberately simple projection (no origin offset, unit scale) so the
// expected screen numbers in these tests are easy to hand-verify:
// screenX = x - y, screenY = x + y.
const PARAMS = { tileWidth: 2, tileHeight: 2, elevationHeight: 2, originX: 0, originY: 0, scale: 1 };

describe("Camera / createCamera", () => {
  it("defaults to x=0, y=0, zoom=1", () => {
    const camera = createCamera();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.zoom).toBe(1);
  });

  it("remembers its initial position as 'home' for resetCamera()", () => {
    const camera = createCamera({ x: 5, y: -2, zoom: 1.5 });
    expect(camera.homeX).toBe(5);
    expect(camera.homeY).toBe(-2);
    expect(camera.homeZoom).toBe(1.5);
  });

  it("clamps an out-of-range initial zoom", () => {
    const camera = createCamera({ zoom: 999, maxZoom: 3 });
    expect(camera.zoom).toBe(3);
  });
});

describe("Camera / pan", () => {
  it("panBy moves the camera by a world-space delta", () => {
    const camera = createCamera();
    const panned = panBy(camera, 5, -3, PARAMS);
    expect(panned.x).toBe(5);
    expect(panned.y).toBe(-3);
  });

  it("panBy never touches zoom or config", () => {
    const camera = createCamera({ zoom: 1.5 });
    const panned = panBy(camera, 1, 1, PARAMS);
    expect(panned.zoom).toBe(1.5);
    expect(panned.viewportWidth).toBe(camera.viewportWidth);
  });

  it("panByScreenDelta: dragging the viewport keeps the world moving with the cursor", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1, viewportWidth: 800, viewportHeight: 600 });
    // Pick a world point, find its screen position, then drag by some delta.
    const worldPoint = { x: 3, y: 1, z: 0 };
    const screenBefore = worldToScreen(worldPoint, camera, PARAMS);
    const panned = panByScreenDelta(camera, 40, -20, PARAMS);
    const screenAfter = worldToScreen(worldPoint, panned, PARAMS);
    // The same world point must now sit exactly (40, -20) further on screen.
    expect(screenAfter.x - screenBefore.x).toBeCloseTo(40, 6);
    expect(screenAfter.y - screenBefore.y).toBeCloseTo(-20, 6);
  });
});

describe("Camera / zoom", () => {
  it("zoomTo sets the zoom directly", () => {
    const camera = createCamera();
    expect(zoomTo(camera, 1.8, PARAMS).zoom).toBe(1.8);
  });

  it("zoomTo clamps to the configured maximum", () => {
    const camera = createCamera({ maxZoom: 2 });
    expect(zoomTo(camera, 50, PARAMS).zoom).toBe(2);
  });

  it("zoomTo clamps to the configured minimum", () => {
    const camera = createCamera({ minZoom: 0.4 });
    expect(zoomTo(camera, 0.01, PARAMS).zoom).toBe(0.4);
  });

  it("never exceeds absurd limits even from repeated zoomBy calls", () => {
    let camera = createCamera({ minZoom: 0.5, maxZoom: 2 });
    for (let i = 0; i < 50; i += 1) camera = zoomBy(camera, 1.5, PARAMS);
    expect(camera.zoom).toBe(2);
    for (let i = 0; i < 50; i += 1) camera = zoomBy(camera, 1 / 1.5, PARAMS);
    expect(camera.zoom).toBe(0.5);
  });

  it("zoomAtViewportPoint keeps the world point under the cursor fixed on screen", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1, viewportWidth: 800, viewportHeight: 600 });
    const worldUnderCursor = { x: 5, y: 2, z: 0 };
    const cursor = worldToScreen(worldUnderCursor, camera, PARAMS);

    const zoomed = zoomAtViewportPoint(camera, cursor, 2, PARAMS);
    expect(zoomed.zoom).toBeCloseTo(2, 6);

    // The exact same viewport point must now map back to the exact same
    // world point -- "la chambre reste sous le curseur".
    const worldAfter = screenToWorld(cursor, zoomed, PARAMS, 0);
    expect(worldAfter.x).toBeCloseTo(worldUnderCursor.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldUnderCursor.y, 6);
  });

  it("zoomAtViewportPoint keeps the anchor fixed when zooming OUT too", () => {
    const camera = createCamera({ x: 1, y: 1, zoom: 1.5, viewportWidth: 800, viewportHeight: 600 });
    const worldUnderCursor = { x: -2, y: 4, z: 0 };
    const cursor = worldToScreen(worldUnderCursor, camera, PARAMS);

    const zoomed = zoomAtViewportPoint(camera, cursor, 1 / 2, PARAMS);
    const worldAfter = screenToWorld(cursor, zoomed, PARAMS, 0);
    expect(worldAfter.x).toBeCloseTo(worldUnderCursor.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldUnderCursor.y, 6);
  });
});

describe("Camera / reset", () => {
  it("resetCamera restores the camera it was created with", () => {
    const camera = createCamera({ x: 10, y: 10, zoom: 1.2 });
    let moved = panBy(camera, 50, -30, PARAMS);
    moved = zoomTo(moved, 2, PARAMS);
    expect(moved.x).not.toBe(10);

    const reset = resetCamera(moved);
    expect(reset.x).toBe(10);
    expect(reset.y).toBe(10);
    expect(reset.zoom).toBe(1.2);
  });
});

describe("Camera / focusOnWorldPoint", () => {
  it("moves the camera's center to a world point, zoom unchanged", () => {
    const camera = createCamera({ zoom: 1.4 });
    const focused = focusOnWorldPoint(camera, 7, -4, PARAMS);
    expect(focused.x).toBe(7);
    expect(focused.y).toBe(-4);
    expect(focused.zoom).toBe(1.4);
  });
});

describe("Camera / worldToScreen and screenToWorld", () => {
  it("worldToScreen projects through the iso projection, centered on the viewport, at zoom 1", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1, viewportWidth: 800, viewportHeight: 600 });
    const screen = worldToScreen({ x: 2, y: 0, z: 0 }, camera, PARAMS);
    // isoScreen = (2-0, 2+0) = (2, 2); camera centered at world origin
    // (isoScreen 0,0); viewport center is (400, 300).
    expect(screen).toEqual({ x: 402, y: 302 });
  });

  it("screenToWorld is the exact inverse of worldToScreen", () => {
    const camera = createCamera({ x: 3, y: -1, zoom: 1.7, viewportWidth: 1000, viewportHeight: 700 });
    const original = { x: 5, y: -3, z: 0 };
    const screen = worldToScreen(original, camera, PARAMS);
    const recovered = screenToWorld(screen, camera, PARAMS, 0);
    expect(recovered.x).toBeCloseTo(original.x, 6);
    expect(recovered.y).toBeCloseTo(original.y, 6);
  });

  it("panning never mutates or moves the world -- only re-centers what the camera reports", () => {
    const camera = createCamera({ viewportWidth: 800, viewportHeight: 600 });
    const worldPoint = { x: 4, y: 4, z: 0 };
    const before = worldToScreen(worldPoint, camera, PARAMS);
    const panned = panBy(camera, 10, 10, PARAMS);
    const after = worldToScreen(worldPoint, panned, PARAMS);
    // The world point itself is still (4, 4) -- only where it lands on
    // screen changed, because the camera moved, not the point.
    expect(worldPoint).toEqual({ x: 4, y: 4, z: 0 });
    expect(after).not.toEqual(before);
  });
});

describe("Camera / different viewport sizes", () => {
  it("worldToScreen centers on whatever viewport size the camera was given", () => {
    const small = createCamera({ viewportWidth: 400, viewportHeight: 300 });
    const large = createCamera({ viewportWidth: 1600, viewportHeight: 1200 });
    const origin = { x: 0, y: 0, z: 0 };
    expect(worldToScreen(origin, small, PARAMS)).toEqual({ x: 200, y: 150 });
    expect(worldToScreen(origin, large, PARAMS)).toEqual({ x: 800, y: 600 });
  });

  it("getViewportTransform's translate matches the viewport's own center", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1, viewportWidth: 1000, viewportHeight: 500 });
    const transform = getViewportTransform(camera, PARAMS);
    expect(transform.translateX).toBe(500);
    expect(transform.translateY).toBe(250);
    expect(transform.zoom).toBe(1);
  });
});

describe("Camera / world bounds (limits)", () => {
  const worldBounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

  it("does not clamp while the camera stays within a generous range of the bounds", () => {
    const camera = createCamera({ x: 5, y: 5, zoom: 1, viewportWidth: 100, viewportHeight: 100, worldBounds });
    const panned = panBy(camera, 1, 1, PARAMS);
    expect(panned.x).toBe(6);
    expect(panned.y).toBe(6);
  });

  it("clamps panBy so the world can't be dragged fully off-screen", () => {
    const camera = createCamera({ x: 5, y: 5, zoom: 1, viewportWidth: 100, viewportHeight: 100, worldBounds });
    const panned = panBy(camera, 10000, 10000, PARAMS);
    // Clamped: the camera's projected center stays within half a viewport
    // of the world bounds' own projected edge, never runs away to infinity.
    expect(panned.x).toBeLessThan(10000);
    expect(panned.y).toBeLessThan(10000);
  });

  it("the clamped range depends on viewport size and zoom, not a hardcoded resolution", () => {
    const smallViewport = createCamera({ x: 5, y: 5, zoom: 1, viewportWidth: 50, viewportHeight: 50, worldBounds });
    const largeViewport = createCamera({ x: 5, y: 5, zoom: 1, viewportWidth: 2000, viewportHeight: 2000, worldBounds });

    const pannedSmall = panBy(smallViewport, 10000, 0, PARAMS);
    const pannedLarge = panBy(largeViewport, 10000, 0, PARAMS);

    // A much larger viewport can already see far past the world bounds on
    // its own, so it's allowed to pan its center further before clamping.
    expect(pannedLarge.x).toBeGreaterThan(pannedSmall.x);
  });

  it("zoomTo/zoomAtViewportPoint also respect world bounds", () => {
    const camera = createCamera({ x: 5, y: 5, zoom: 2, viewportWidth: 100, viewportHeight: 100, worldBounds });
    const zoomedOut = zoomTo(camera, 0.5, PARAMS);
    expect(Number.isFinite(zoomedOut.x)).toBe(true);
    expect(Number.isFinite(zoomedOut.y)).toBe(true);
  });
});

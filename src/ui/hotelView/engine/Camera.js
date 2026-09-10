// A scene camera: a viewport onto WORLD space, expressed purely in world
// coordinates. Framework- and domain-independent (no React, no notion of
// "room"/"hotel"/anything) -- same reasoning every other engine/ file
// follows. It never touches an entity's own position -- panning/zooming
// only ever changes the CAMERA, never the world it's looking at (see this
// file's own tests for that guarantee).
//
// The render pipeline this camera sits in:
//
//   WORLD -> ISO PROJECTION (IsoProjection.js, unchanged) -> CAMERA
//   TRANSFORM (this file) -> SCREEN
//
// IsoProjection.js stays the single source of truth for the isometric
// math; this file adds one more, purely linear, stage on top of it: pan
// (translate) + zoom (scale), centered on the viewport. `worldToScreen()`/
// `screenToWorld()` below chain both stages so a caller never has to.
import { worldToScreen as projectWorldToScreen, screenToWorld as unprojectScreenToWorld } from "./IsoProjection";
import { safeNumber, safeObject } from "../../../lib/safe";

export const DEFAULT_CAMERA_CONFIG = {
  minZoom: 0.5,
  maxZoom: 2.5,
  viewportWidth: 800,
  viewportHeight: 600,
  // {minX, maxX, minY, maxY} in WORLD units, or null for "no clamping".
  worldBounds: null,
};

function clamp(value, min, max) {
  if (min != null && value < min) return min;
  if (max != null && value > max) return max;
  return value;
}

// Creates a camera. `x`/`y` (world-space point the camera is centered on)
// and `zoom` are the camera's own minimal, moving state; everything else
// in `DEFAULT_CAMERA_CONFIG` is configuration carried alongside it (so a
// single plain object can be passed around and updated as one piece of
// state, same pattern SceneState.js's entities already follow). The
// camera's initial `x`/`y`/`zoom` are also remembered as its "home"
// position for `resetCamera()`.
export function createCamera(overrides = {}) {
  const source = safeObject(overrides);
  const config = { ...DEFAULT_CAMERA_CONFIG, ...source };
  const x = safeNumber(source.x, 0);
  const y = safeNumber(source.y, 0);
  const zoom = clamp(safeNumber(source.zoom, 1), config.minZoom, config.maxZoom);

  return {
    ...config,
    x,
    y,
    zoom,
    homeX: x,
    homeY: y,
    homeZoom: zoom,
  };
}

// Projects the world bounds' four corners through the iso projection to
// get an axis-aligned bounding box in the SAME (linear) space the camera
// itself is centered in, then clamps the camera's projected center so at
// most half a viewport (at the current zoom) can ever go past an edge --
// enough that the hotel can never be panned fully off-screen, without
// ever hardcoding a screen resolution: the margin is derived from
// `viewportWidth`/`viewportHeight`/`zoom` alone, exactly as required.
function clampToWorldBounds(camera, projectionParams) {
  if (!camera.worldBounds) return camera;
  const { minX, maxX, minY, maxY } = camera.worldBounds;

  const corners = [
    projectWorldToScreen({ x: minX, y: minY, z: 0 }, projectionParams),
    projectWorldToScreen({ x: maxX, y: minY, z: 0 }, projectionParams),
    projectWorldToScreen({ x: minX, y: maxY, z: 0 }, projectionParams),
    projectWorldToScreen({ x: maxX, y: maxY, z: 0 }, projectionParams),
  ];
  const isoMinX = Math.min(...corners.map((c) => c.x));
  const isoMaxX = Math.max(...corners.map((c) => c.x));
  const isoMinY = Math.min(...corners.map((c) => c.y));
  const isoMaxY = Math.max(...corners.map((c) => c.y));

  const isoCenter = projectWorldToScreen({ x: camera.x, y: camera.y, z: 0 }, projectionParams);
  const marginX = camera.viewportWidth / (2 * camera.zoom);
  const marginY = camera.viewportHeight / (2 * camera.zoom);

  const clampedIsoX = clamp(isoCenter.x, isoMinX - marginX, isoMaxX + marginX);
  const clampedIsoY = clamp(isoCenter.y, isoMinY - marginY, isoMaxY + marginY);
  if (clampedIsoX === isoCenter.x && clampedIsoY === isoCenter.y) return camera;

  const clampedWorld = unprojectScreenToWorld({ x: clampedIsoX, y: clampedIsoY }, projectionParams, 0);
  return { ...camera, x: clampedWorld.x, y: clampedWorld.y };
}

// World {x, y, z} -> SCREEN {x, y} pixels, i.e. actual viewport/CSS
// pixels, chaining IsoProjection's own projection with this camera's pan +
// zoom, centered on the viewport (`viewportWidth/2`, `viewportHeight/2`).
export function worldToScreen(worldPosition, camera, projectionParams) {
  const isoScreen = projectWorldToScreen(worldPosition, projectionParams);
  const isoCenter = projectWorldToScreen({ x: camera.x, y: camera.y, z: 0 }, projectionParams);
  return {
    x: (isoScreen.x - isoCenter.x) * camera.zoom + camera.viewportWidth / 2,
    y: (isoScreen.y - isoCenter.y) * camera.zoom + camera.viewportHeight / 2,
  };
}

// SCREEN {x, y} pixels -> world {x, y, z}, the exact inverse of
// `worldToScreen()` above. Same "caller supplies `z`" contract as
// IsoProjection.screenToWorld() -- a 2D screen point alone can't recover
// 3 world dimensions.
export function screenToWorld(screenPosition, camera, projectionParams, z = 0) {
  const { x: screenX, y: screenY } = safeObject(screenPosition);
  const isoCenter = projectWorldToScreen({ x: camera.x, y: camera.y, z: 0 }, projectionParams);
  const isoScreen = {
    x: (screenX - camera.viewportWidth / 2) / camera.zoom + isoCenter.x,
    y: (screenY - camera.viewportHeight / 2) / camera.zoom + isoCenter.y,
  };
  return unprojectScreenToWorld(isoScreen, projectionParams, z);
}

// Pans the camera by a WORLD-space delta directly -- the low-level
// primitive both "pan horizontal" (dy = 0) and "pan vertical" (dx = 0) are
// just a call of. See `panByScreenDelta()` below for the drag-friendly,
// screen-space version an interactive layer (SceneCamera.jsx) actually
// wants.
export function panBy(camera, dx, dy, projectionParams) {
  const next = { ...camera, x: camera.x + safeNumber(dx, 0), y: camera.y + safeNumber(dy, 0) };
  return clampToWorldBounds(next, projectionParams);
}

// Pans the camera so that dragging the viewport by `(dxScreen, dyScreen)`
// pixels moves the world under the cursor by the same screen-space
// amount -- the natural feel of "grabbing" the map. Reuses
// IsoProjection.screenToWorld()'s own inverse linear system directly
// (origin zeroed out -- only the DELTA matters here, not an absolute
// point) rather than re-deriving the same math a second time.
export function panByScreenDelta(camera, dxScreen, dyScreen, projectionParams) {
  const deltaWorld = unprojectScreenToWorld(
    { x: -safeNumber(dxScreen, 0) / camera.zoom, y: -safeNumber(dyScreen, 0) / camera.zoom },
    { ...safeObject(projectionParams), originX: 0, originY: 0 },
    0
  );
  return panBy(camera, deltaWorld.x, deltaWorld.y, projectionParams);
}

// Sets the zoom directly, clamped to [minZoom, maxZoom].
export function zoomTo(camera, zoom, projectionParams) {
  const next = { ...camera, zoom: clamp(safeNumber(zoom, camera.zoom), camera.minZoom, camera.maxZoom) };
  return clampToWorldBounds(next, projectionParams);
}

// Zooms by a relative factor (e.g. 1.1 to zoom in 10%, 1/1.1 to zoom out),
// without anchoring to any particular screen point -- see
// `zoomAtViewportPoint()` below for the cursor-anchored version wheel
// events actually want.
export function zoomBy(camera, factor, projectionParams) {
  return zoomTo(camera, camera.zoom * safeNumber(factor, 1), projectionParams);
}

// Zooms by `factor`, keeping the world point currently under
// `viewportPoint` (viewport/CSS pixels) visually fixed under that same
// point after the zoom -- e.g. the room under the cursor stays under the
// cursor. Implemented by reusing this module's own `screenToWorld()`/
// `worldToScreen()` rather than re-deriving the anchoring algebra by hand:
// find the world point under the cursor before zooming, apply the zoom,
// then pan by whatever correction re-aligns that same world point back
// under the cursor.
export function zoomAtViewportPoint(camera, viewportPoint, factor, projectionParams) {
  const worldBefore = screenToWorld(viewportPoint, camera, projectionParams, 0);
  const zoomed = zoomTo(camera, camera.zoom * safeNumber(factor, 1), projectionParams);
  const worldAfter = screenToWorld(viewportPoint, zoomed, projectionParams, 0);
  return panBy(zoomed, worldBefore.x - worldAfter.x, worldBefore.y - worldAfter.y, projectionParams);
}

// Moves the camera's center to a world point, zoom unchanged.
export function focusOnWorldPoint(camera, x, y, projectionParams) {
  const next = { ...camera, x: safeNumber(x, camera.x), y: safeNumber(y, camera.y) };
  return clampToWorldBounds(next, projectionParams);
}

// Restores the camera to the x/y/zoom it was created with.
export function resetCamera(camera) {
  return { ...camera, x: camera.homeX, y: camera.homeY, zoom: camera.homeZoom };
}

// NOT implemented yet on purpose: `focusOnEntity(camera, entityId, ...)`
// would need a SceneState to look the entity's position up in (see
// SceneState.js's own `getEntityById()`) -- an extra dependency this step
// doesn't need. Once wired, it will simply be
// `focusOnWorldPoint(camera, entity.position.x, entity.position.y, ...)`.

// The CSS transform for a single wrapper element around the scene's
// existing, camera-UNAWARE content (every entity keeps being positioned
// via plain IsoProjection.worldToScreen(), exactly as before this step) --
// letting the browser's own compositor pan/zoom the whole already-rendered
// scene in one step (translate3d + scale) rather than recomputing every
// entity's screen position whenever only the camera changes. See
// SceneCamera.jsx, the one place this gets applied.
export function getViewportTransform(camera, projectionParams) {
  const isoCenter = projectWorldToScreen({ x: camera.x, y: camera.y, z: 0 }, projectionParams);
  return {
    translateX: camera.viewportWidth / 2 - isoCenter.x * camera.zoom,
    translateY: camera.viewportHeight / 2 - isoCenter.y * camera.zoom,
    zoom: camera.zoom,
  };
}

const Camera = {
  DEFAULT_CAMERA_CONFIG,
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
};
export default Camera;

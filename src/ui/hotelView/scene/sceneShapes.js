// A tiny, purely geometric helper: turns four already-PROJECTED screen
// corners (top/right/bottom/left -- e.g. via IsoProjection.worldToScreen(),
// never computed here) plus a wall depth into the three CSS `clip-path`
// polygons that give an isometric "platform" its volume -- a top face and
// two side walls below its front-facing edges. Used by both
// SceneTerrainBase.jsx (one big platform, the whole terrain) and
// SceneObject.jsx (one small block per placeholder) so the same visual
// language -- "a flat top plus two shaded walls" -- reads consistently at
// every scale. No isometric math of its own: every point this module ever
// touches was already produced by IsoProjection.js.
export function buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, depthPx) {
  const minX = Math.min(topCorner.x, rightCorner.x, bottomCorner.x, leftCorner.x);
  const minY = Math.min(topCorner.y, rightCorner.y, bottomCorner.y, leftCorner.y);
  const maxX = Math.max(topCorner.x, rightCorner.x, bottomCorner.x, leftCorner.x);
  const maxY = Math.max(topCorner.y, rightCorner.y, bottomCorner.y, leftCorner.y) + depthPx;

  const rel = (p) => ({ x: p.x - minX, y: p.y - minY });
  const top = rel(topCorner);
  const right = rel(rightCorner);
  const bottom = rel(bottomCorner);
  const left = rel(leftCorner);

  const point = (p) => `${p.x}px ${p.y}px`;

  return {
    originX: minX,
    originY: minY,
    width: maxX - minX,
    height: maxY - minY,
    topFace: `polygon(${point(top)}, ${point(right)}, ${point(bottom)}, ${point(left)})`,
    leftFace: `polygon(${point(left)}, ${point(bottom)}, ${point({ x: bottom.x, y: bottom.y + depthPx })}, ${point({ x: left.x, y: left.y + depthPx })})`,
    rightFace: `polygon(${point(right)}, ${point(bottom)}, ${point({ x: bottom.x, y: bottom.y + depthPx })}, ${point({ x: right.x, y: right.y + depthPx })})`,
  };
}

const sceneShapes = { buildPlatformShape };
export default sceneShapes;

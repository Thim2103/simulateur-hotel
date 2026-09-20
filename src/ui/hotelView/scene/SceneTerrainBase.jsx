import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { buildPlatformShape } from "./sceneShapes";
import { SCENE_PROJECTION, TERRAIN_DEPTH, PALETTE, MATERIAL_FACES } from "./SceneTokens";

// The terrain's own "surface principale" + "limites visibles" + "vraie
// profondeur": ONE continuous isometric platform -- a top face plus two
// shaded side walls -- spanning the whole world, rather than a pile of
// individually-walled tiles (that would look like separate floating
// blocks, not a single island). Every position here comes from
// IsoProjection.js (`tileToWorld`/`worldToScreen`, via SCENE_PROJECTION,
// see SceneTokens.js) -- no local isometric formula.
//
// `bounds` is the world's own tile-space extent: `{minCol, maxCol,
// minRow, maxRow}`. Because the iso projection is linear, a rectangle's
// four CORNER tiles alone are enough to describe the whole platform's
// silhouette -- see sceneShapes.js's own docstring for how those four
// projected points become the top/left/right face polygons.
export default function SceneTerrainBase({ bounds }) {
  const { minCol, maxCol, minRow, maxRow } = bounds;

  const topCorner = worldToScreen(tileToWorld({ col: minCol, row: minRow }), SCENE_PROJECTION);
  const rightCorner = worldToScreen(tileToWorld({ col: maxCol, row: minRow }), SCENE_PROJECTION);
  const bottomCorner = worldToScreen(tileToWorld({ col: maxCol, row: maxRow }), SCENE_PROJECTION);
  const leftCorner = worldToScreen(tileToWorld({ col: minCol, row: maxRow }), SCENE_PROJECTION);

  const shape = buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, TERRAIN_DEPTH);

  return (
    <div
      data-testid="scene-terrain-base"
      aria-hidden="true"
      className="absolute"
      style={{ left: shape.originX, top: shape.originY, width: shape.width, height: shape.height }}
    >
      {/* Grounding shadow: a soft, blurred ellipse under the whole platform. */}
      <div
        className="absolute rounded-full"
        style={{
          left: "8%",
          right: "8%",
          bottom: 0,
          height: TERRAIN_DEPTH * 0.6,
          background: PALETTE.shadow,
          filter: "blur(18px)",
          opacity: 0.6,
        }}
      />
      {/* Terrain reads through the SAME `ground` material family every
          other primitive in this scene uses (see SceneTokens.js's own
          MATERIAL_FACES/SceneLighting.js's shared light source) -- its
          `.left`/`.right`/`.shadow` tones, not a standalone palette. */}
      <div className="absolute inset-0" style={{ clipPath: shape.leftFace, background: `linear-gradient(180deg, ${MATERIAL_FACES.ground.left}, ${MATERIAL_FACES.ground.right})` }} />
      <div className="absolute inset-0" style={{ clipPath: shape.rightFace, background: `linear-gradient(180deg, ${MATERIAL_FACES.ground.right}, ${MATERIAL_FACES.ground.shadow})` }} />
      <div
        className="absolute inset-0"
        style={{
          clipPath: shape.topFace,
          background: `linear-gradient(135deg, ${MATERIAL_FACES.ground.top} 0%, ${MATERIAL_FACES.ground.highlight} 60%, ${MATERIAL_FACES.ground.top} 100%)`,
        }}
      />
    </div>
  );
}

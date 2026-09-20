import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { buildPlatformShape } from "./sceneShapes";
import { SCENE_PROJECTION, ELEVATION_HEIGHT, PALETTE } from "./SceneTokens";

// The ONE shared visual treatment every interactive volume in the scene
// uses for hover/selection/disabled -- a subtle CSS `filter`, never a
// bespoke outline or a color swap picked per component (see this step's
// own "le hover ne doit pas détruire la direction artistique" /
// "contours jaunes énormes" warning). `default`/`hovered` brighten
// slightly (a soft glow for `hovered`, via `drop-shadow` rather than a
// hard border); `disabled` desaturates and dims. Exported so non-
// SceneVolume shapes (e.g. scene/primitives/IsoEnvironment.jsx's foliage,
// which isn't a box) can apply the exact same treatment.
export const INTERACTION_FILTERS = {
  default: "none",
  hovered: `brightness(1.08) drop-shadow(0 0 5px ${PALETTE.hoverBorder}99)`,
  selected: `brightness(1.05) drop-shadow(0 0 7px ${PALETTE.selectedBorder}cc)`,
  disabled: "grayscale(0.5) brightness(0.85)",
};

export function getInteractionFilter(state) {
  return INTERACTION_FILTERS[state] ?? INTERACTION_FILTERS.default;
}

// The ONE shared primitive every simple isometric box in this scene is
// built from -- a top face plus two shaded side faces (see
// sceneShapes.js's own docstring), positioned EXCLUSIVELY from world
// coordinates (`tile` + `elevation`, fed through IsoProjection.js via
// SCENE_PROJECTION -- never a screen offset) and sized from a `footprint`
// (`width`/`depth` in world TILE units, `height` in world Z units, same
// convention SceneState.js's own entities use). `colors` is the
// `{top, left, right, highlight, shadow}` quintuple SceneLighting.js's
// `buildFaceColors()` produces (via SceneTokens.js's `MATERIAL_FACES`),
// never picked ad hoc, so every volume in the scene -- a test block, a
// wall, a window, a plant -- is lit the exact same way.
//
// `interactionState` ("default" | "hovered" | "selected" | "disabled")
// drives the shared filter above. `groundShadow` adds ONE consistent
// blurred contact-shadow ellipse at the volume's own base (see this step's
// own "pas d'ombre différente arbitrairement selon chaque bâtiment" rule)
// -- free-standing primitives (a tree, a lamp, a bench...) turn it on;
// wall-mounted ones (a window, a wall panel) leave it off. `title`/
// `ariaLabel` are forwarded to the DOM for accessibility (see this step's
// own "ne sacrifie pas la testabilité" rule) without changing anything
// visual.
//
// scene/lobby/*.jsx and scene/primitives/*.jsx's box-shaped primitives all
// render through this one component.
export default function SceneVolume({
  tile,
  elevation = 0,
  footprint,
  colors,
  testId = "scene-volume",
  dataAttrs,
  onMouseEnter,
  onMouseLeave,
  onClick,
  interactionState = "default",
  groundShadow = false,
  title,
  ariaLabel,
}) {
  const { width, depth, height } = footprint;

  const topCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row, elevation }), SCENE_PROJECTION);
  const rightCorner = worldToScreen(tileToWorld({ col: tile.col + width, row: tile.row, elevation }), SCENE_PROJECTION);
  const bottomCorner = worldToScreen(tileToWorld({ col: tile.col + width, row: tile.row + depth, elevation }), SCENE_PROJECTION);
  const leftCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row + depth, elevation }), SCENE_PROJECTION);

  const depthPx = Math.max(2, height * ELEVATION_HEIGHT);
  const shape = buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, depthPx);

  return (
    <div
      data-testid={testId}
      data-state={interactionState}
      {...dataAttrs}
      className="absolute"
      style={{
        left: shape.originX,
        top: shape.originY,
        width: shape.width,
        height: shape.height,
        cursor: onClick ? "pointer" : undefined,
        filter: getInteractionFilter(interactionState),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      {groundShadow && (
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ left: "15%", right: "15%", bottom: -shape.height * 0.015, height: Math.max(4, shape.width * 0.12), background: PALETTE.shadow, filter: "blur(5px)", opacity: 0.4 }}
        />
      )}
      <div className="absolute inset-0" style={{ clipPath: shape.leftFace, background: colors.left }} />
      <div className="absolute inset-0" style={{ clipPath: shape.rightFace, background: colors.right }} />
      <div className="absolute inset-0" style={{ clipPath: shape.topFace, background: colors.top }} />
    </div>
  );
}

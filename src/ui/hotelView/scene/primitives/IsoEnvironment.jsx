import { worldToScreen, tileToWorld } from "../../engine/IsoProjection";
import SceneVolume, { getInteractionFilter } from "../SceneVolume";
import { SCENE_PROJECTION, MATERIAL_FACES, PALETTE, SCALE } from "../SceneTokens";

// The environment primitives: IsoTree, IsoBush, IsoRock, IsoFence. Every
// one of them respects the same rules as scene/SceneVolume.jsx's own box
// primitives -- world coordinates only (via IsoProjection.js/
// SCENE_PROJECTION), colors only from SceneTokens.js's `MATERIAL_FACES`
// (itself SceneLighting.js's one shared light source), the shared hover/
// selected/disabled treatment (SceneVolume.js's `getInteractionFilter()`).

// IsoFoliage: the one non-box shape in this whole catalog -- a round
// canopy (optionally over a short trunk). Not built via SceneVolume/
// sceneShapes (a canopy isn't a flat-faced box), but still positioned
// EXCLUSIVELY via IsoProjection, and still colored from `MATERIAL_FACES`
// (vegetation/wood) -- never an ad hoc color. Exported so
// scene/primitives/IsoDecor.jsx's `IsoPlant` can reuse the exact same
// shape at a smaller scale, rather than inventing a second one.
export function IsoFoliage({ tile, elevation = 0, size = 46, trunkHeight = 20, hasTrunk = true, interactionState = "default", testId = "iso-foliage", onMouseEnter, onMouseLeave, onClick, title }) {
  const screen = worldToScreen(tileToWorld({ col: tile.col + 0.5, row: tile.row + 0.5, elevation }), SCENE_PROJECTION);
  return (
    <span
      data-testid={testId}
      data-state={interactionState}
      className="absolute flex flex-col items-center"
      style={{ left: screen.x, top: screen.y, transform: "translate(-50%, -100%)", filter: getInteractionFilter(interactionState), cursor: onClick ? "pointer" : undefined }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title={title}
    >
      <span
        aria-hidden="true"
        className="rounded-full"
        style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${MATERIAL_FACES.vegetation.highlight}, ${MATERIAL_FACES.vegetation.right})`, boxShadow: `0 6px 10px ${PALETTE.shadow}` }}
      />
      {hasTrunk && (
        <span aria-hidden="true" style={{ width: Math.max(4, size * 0.17), height: trunkHeight, background: `linear-gradient(${MATERIAL_FACES.wood.left}, ${MATERIAL_FACES.wood.shadow})`, borderRadius: 2 }} />
      )}
    </span>
  );
}

export function IsoTree({ tile, elevation = 0, interactionState = "default", testId = "iso-tree", ...rest }) {
  return <IsoFoliage tile={tile} elevation={elevation} size={46} trunkHeight={20} hasTrunk interactionState={interactionState} testId={testId} {...rest} />;
}

export function IsoBush({ tile, elevation = 0, interactionState = "default", testId = "iso-bush", ...rest }) {
  return <IsoFoliage tile={tile} elevation={elevation} size={30} trunkHeight={0} hasTrunk={false} interactionState={interactionState} testId={testId} {...rest} />;
}

export function IsoRock({ tile, elevation = 0, material = "stone", interactionState = "default", testId = "iso-rock", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: 0.4, depth: 0.35, height: 0.22 }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      groundShadow
      {...rest}
    />
  );
}

// A fence SEGMENT -- one tile wide by default, deliberately lower than
// IsoWall (see SCALE.FENCE_HEIGHT's own comment: "assez bas pour voir
// par-dessus -- un marqueur de limite, pas un mur"). Several placed
// side by side mark a boundary without blocking the view into it.
export function IsoFence({ tile, elevation = 0, width = 1, material = "wood", interactionState = "default", testId = "iso-fence", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width, depth: SCALE.WALL_THICKNESS, height: SCALE.FENCE_HEIGHT }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

const IsoEnvironment = { IsoFoliage, IsoTree, IsoBush, IsoRock, IsoFence };
export default IsoEnvironment;

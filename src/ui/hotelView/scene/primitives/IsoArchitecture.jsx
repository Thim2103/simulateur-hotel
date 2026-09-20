import SceneVolume from "../SceneVolume";
import { MATERIAL_FACES, SCALE } from "../SceneTokens";

// The architecture primitives: IsoFloor, IsoWall, IsoRoof, IsoDoor,
// IsoWindow, IsoColumn, IsoStair, IsoPath. Every one of them is a thin,
// typed wrapper around scene/SceneVolume.jsx (the one shared box
// primitive) -- no isometric formula of its own, every dimension a
// SCALE.* default (see SceneTokens.js), every color a MATERIAL_FACES.*
// entry (SceneLighting.js's one shared light source). This is the exact
// same technique scene/lobby/LobbyBuilding.jsx's own sub-components
// already used, just generalized into reusable, named building blocks a
// future building can compose from directly instead of writing its own
// one-off SceneVolume calls.

// A flat, thin tile -- an interior floor by default (`ground`); pass
// `material="stone"` (or anything else) for a different finish.
export function IsoFloor({ tile, elevation = 0, width = 1, depth = 1, material = "ground", interactionState = "default", testId = "iso-floor", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width, depth, height: SCALE.FLOOR_THICKNESS }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

// Same shape as IsoFloor, `stone` by default -- an OUTDOOR walkway tile
// rather than an indoor floor. Kept as its own named component (not just
// `<IsoFloor material="stone">`) because "is this a path or a floor" is a
// meaningful distinction for whatever places these tiles later.
export function IsoPath({ tile, elevation = 0, width = 1, depth = 1, material = "stone", interactionState = "default", testId = "iso-path", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width, depth, height: SCALE.FLOOR_THICKNESS }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

// One wall segment/panel -- `width` tiles long, `SCALE.WALL_THICKNESS`
// deep, `SCALE.WALL_HEIGHT` tall by default. A building's own outer box
// (see LobbyBuilding.jsx) is simplest as one wide IsoWall spanning its
// whole footprint; a more articulated building can compose several
// narrower ones instead -- both are the same primitive.
export function IsoWall({ tile, elevation = 0, width = 1, depth = SCALE.WALL_THICKNESS, height = SCALE.WALL_HEIGHT, material = "wall", interactionState = "default", testId = "iso-wall", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width, depth, height }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

// A roof cap: overhangs its own `width`/`depth` footprint by `overhang` on
// every side (see LobbyRoof.jsx, which this generalizes) -- a plain,
// slightly wider box reads as "a roof" against the walls below it without
// any real gable/pitch geometry.
export function IsoRoof({ tile, elevation = 0, width = 1, depth = 1, height = SCALE.ROOF_HEIGHT, overhang = SCALE.ROOF_OVERHANG, material = "roof", interactionState = "default", testId = "iso-roof", ...rest }) {
  return (
    <SceneVolume
      tile={{ col: tile.col - overhang, row: tile.row - overhang }}
      elevation={elevation}
      footprint={{ width: width + overhang * 2, depth: depth + overhang * 2, height }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

// A door slab, flush with a wall (see SCALE.WALL_THICKNESS) -- `wood` by
// default.
export function IsoDoor({ tile, elevation = 0, width = SCALE.DOOR_WIDTH, depth = SCALE.WALL_THICKNESS, height = SCALE.DOOR_HEIGHT, material = "wood", interactionState = "default", testId = "iso-door", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width, depth, height }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      {...rest}
    />
  );
}

// A window: a frame (`metal` by default) with a smaller glass pane
// (`glass`) nested just in front of it -- both plain SceneVolumes at
// almost the same position, glass drawn AFTER the frame so it reads on
// top where they overlap (same two-layer technique
// scene/lobby/LobbyWindows.jsx's own `Window` sub-component already
// used). `elevation` is the window's own SILL height -- pass
// `wallHeight * SCALE.WINDOW_SILL_RATIO` to sit it mid-wall, matching
// LobbyWindows.jsx's own convention.
export function IsoWindow({
  tile,
  elevation = 0,
  width = SCALE.WINDOW_WIDTH,
  height = SCALE.WINDOW_HEIGHT,
  depth = SCALE.WALL_THICKNESS,
  frameMaterial = "metal",
  glassMaterial = "glass",
  interactionState = "default",
  testId = "iso-window",
  ...rest
}) {
  const inset = 0.05;
  return (
    <>
      <SceneVolume tile={tile} elevation={elevation} footprint={{ width, depth, height }} colors={MATERIAL_FACES[frameMaterial]} testId={`${testId}-frame`} interactionState={interactionState} {...rest} />
      <SceneVolume
        tile={{ col: tile.col + inset, row: tile.row + inset * 0.4 }}
        elevation={elevation + inset}
        footprint={{ width: Math.max(0.05, width - inset * 2), depth: depth + 0.015, height: Math.max(0.05, height - inset * 2) }}
        colors={MATERIAL_FACES[glassMaterial]}
        testId={`${testId}-glass`}
      />
    </>
  );
}

// A slim column/pillar -- `stone` by default, `SCALE.COLUMN_HEIGHT` tall.
export function IsoColumn({ tile, elevation = 0, size = 0.12, height = SCALE.COLUMN_HEIGHT, material = "stone", interactionState = "default", testId = "iso-column", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: size, depth: size, height }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      groundShadow
      {...rest}
    />
  );
}

// A short flight of steps -- `steps` shallow, stacked platforms
// (`SCALE.STAIR_STEP_HEIGHT`/`STEP_DEPTH` each), `stone` by default (see
// LobbyEntrance.jsx's own single "perron" step, which this generalizes to
// any number of steps).
export function IsoStair({ tile, elevation = 0, steps = 2, width = 0.6, stepDepth = SCALE.STAIR_STEP_DEPTH, stepHeight = SCALE.STAIR_STEP_HEIGHT, material = "stone", testId = "iso-stair" }) {
  return (
    <>
      {Array.from({ length: steps }, (_, i) => (
        <SceneVolume
          key={i}
          tile={{ col: tile.col, row: tile.row + i * stepDepth }}
          elevation={elevation}
          footprint={{ width, depth: stepDepth * (steps - i), height: stepHeight * (i + 1) }}
          colors={MATERIAL_FACES[material]}
          testId={`${testId}-step-${i}`}
        />
      ))}
    </>
  );
}

const IsoArchitecture = { IsoFloor, IsoPath, IsoWall, IsoRoof, IsoDoor, IsoWindow, IsoColumn, IsoStair };
export default IsoArchitecture;

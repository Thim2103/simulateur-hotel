import SceneVolume from "../SceneVolume";
import { MATERIAL_FACES, SCALE } from "../SceneTokens";
import { IsoFoliage } from "./IsoEnvironment";

// The decoration primitives: IsoPlant, IsoLamp, IsoBench, IsoSign,
// IsoTable, IsoChair. Same rules as scene/primitives/IsoArchitecture.jsx's
// own components -- thin wrappers around SceneVolume (or, for IsoPlant,
// IsoEnvironment.jsx's shared foliage shape), every dimension a `SCALE.*`
// default, every color a `MATERIAL_FACES.*` entry. "FEW HIGH-VALUE
// DETAILS" (see this step's own rule) -- each one stays a single small
// volume (or, for IsoPlant/IsoLamp, two), not an elaborate multi-part
// model.

// A potted plant: a small pot (`stone` by default) with IsoEnvironment's
// own foliage shape on top, at DECOR_SCALE -- reused rather than a second,
// slightly-different plant shape.
export function IsoPlant({ tile, elevation = 0, potMaterial = "stone", interactionState = "default", testId = "iso-plant", onMouseEnter, onMouseLeave, onClick }) {
  return (
    <>
      <SceneVolume
        tile={tile}
        elevation={elevation}
        footprint={{ width: 0.3, depth: 0.3, height: 0.18 }}
        colors={MATERIAL_FACES[potMaterial]}
        testId={`${testId}-pot`}
        interactionState={interactionState}
        groundShadow
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
      <IsoFoliage tile={tile} elevation={elevation + 0.18} size={SCALE.DECOR_SCALE * 80} trunkHeight={0} hasTrunk={false} interactionState={interactionState} testId={`${testId}-foliage`} />
    </>
  );
}

// A lamp post: a slim pole (`metal`) with a small lit top (`accent`, read
// as a warm glow).
export function IsoLamp({ tile, elevation = 0, poleMaterial = "metal", topMaterial = "accent", interactionState = "default", testId = "iso-lamp", onMouseEnter, onMouseLeave, onClick }) {
  return (
    <>
      <SceneVolume
        tile={tile}
        elevation={elevation}
        footprint={{ width: 0.08, depth: 0.08, height: 0.75 }}
        colors={MATERIAL_FACES[poleMaterial]}
        testId={`${testId}-post`}
        interactionState={interactionState}
        groundShadow
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
      <SceneVolume
        tile={{ col: tile.col - 0.04, row: tile.row - 0.04 }}
        elevation={elevation + 0.75}
        footprint={{ width: 0.16, depth: 0.16, height: 0.12 }}
        colors={MATERIAL_FACES[topMaterial]}
        testId={`${testId}-top`}
        interactionState={interactionState}
      />
    </>
  );
}

// A low, wide bench -- `wood` by default.
export function IsoBench({ tile, elevation = 0, length = 0.55, material = "wood", interactionState = "default", testId = "iso-bench", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: 0.16, depth: length, height: SCALE.FURNITURE_HEIGHT }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      groundShadow
      {...rest}
    />
  );
}

// A small signage plaque -- `accent` by default. `label` becomes its
// title/aria-label (see this step's own "titre ou aria-label approprié"
// rule) -- the ONE primitive in this file most likely to need one.
export function IsoSign({ tile, elevation = 0.15, material = "accent", label, interactionState = "default", testId = "iso-sign", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: 0.14, depth: 0.06, height: 0.32 }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      title={label}
      ariaLabel={label}
      {...rest}
    />
  );
}

// A small table -- `wood` by default.
export function IsoTable({ tile, elevation = 0, material = "wood", interactionState = "default", testId = "iso-table", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: 0.4, depth: 0.4, height: 0.14 }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      groundShadow
      {...rest}
    />
  );
}

// A small chair -- `wood` by default.
export function IsoChair({ tile, elevation = 0, material = "wood", interactionState = "default", testId = "iso-chair", ...rest }) {
  return (
    <SceneVolume
      tile={tile}
      elevation={elevation}
      footprint={{ width: 0.22, depth: 0.22, height: 0.2 }}
      colors={MATERIAL_FACES[material]}
      testId={testId}
      interactionState={interactionState}
      groundShadow
      {...rest}
    />
  );
}

const IsoDecor = { IsoPlant, IsoLamp, IsoBench, IsoSign, IsoTable, IsoChair };
export default IsoDecor;

// The normalized, domain-agnostic scene state model. This is the *shape*
// every future scene-manipulating piece (a render pass, a camera
// controller, a future SceneLoop/pathfinding step) will read and write --
// it knows nothing about hotels, rooms, guests or ADR; it only knows
// "entities positioned in world space, plus a camera and an interaction
// state". The one place allowed to translate business data into this
// shape is EntityFactory.js (see its own docstring) -- SceneState.js never
// imports it and never will.
//
// Deliberately a plain, serializable object (no class, no React ref, no
// method attached to an entity) so it can be snapshotted, diffed, logged,
// or handed to a future replay/undo system without any special-casing --
// same reasoning IsoProjection.js and DepthSort.js already followed for
// framework/domain independence.
import { safeArray, safeNumber, safeObject, safeString } from "../../../lib/safe";

// One scene entity. The shape is intentionally richer than what this step
// actually uses (`position` is the only field anything currently reads) --
// `previousPosition`/`targetPosition`/`rotation`/`layer` exist now, always
// present and always null/0, purely so a future movement/animation step
// (SceneLoop, pathfinding, tweening) can start writing to them without
// ever having to change an entity's shape or migrate existing data.
//
//   id        -- stable, unique across the whole scene (see EntityFactory.js
//                for how each entity type derives its own stable id).
//   type      -- a generic visual/spatial category (e.g. "room", "reception",
//                "character", "incident") -- never a business concept.
//   position  -- current world-space {x, y, z}, see IsoProjection.js.
//   previousPosition, targetPosition -- an in-progress movement's start
//                point and destination (world space); both null when the
//                entity isn't moving. See MotionSystem.js, the only module
//                that writes to these.
//   movement  -- { active, speed, progress }: whether a movement is
//                currently in progress, its speed (world units/second),
//                and its progress (0..1) along the straight line from
//                `previousPosition` to `targetPosition`. Plain data only --
//                no timers, no function references -- so the whole entity
//                stays trivially serializable (see this file's own tests).
//   path      -- { waypoints, speed } | null: the REMAINING world-space
//                stops after the one currently in `targetPosition`, for an
//                entity walking a multi-leg path. See PathFollower.js, the
//                only module that writes to this.
//   footprint -- world-space {width, depth, height} bounding box, consumed
//                by DepthSort.js; defaults to a zero-size point.
//   state     -- a generic entity state (e.g. "clean", "occupied", "idle"),
//                never a raw business field name.
//   activity  -- a generic ambient activity (e.g. "walking", "cooking"),
//                only meaningful for character-like entities.
//   rotation  -- reserved for future facing/orientation; always 0 for now.
//   layer     -- reserved for future multi-layer scenes (e.g. floor vs.
//                roof); always 0 for now.
//   metadata  -- a small, generic bag of extra display data (e.g. a room's
//                displayed number, a character's kind, an incident's
//                message) -- never the full original business object (see
//                EntityFactory.js's own tests for that guarantee).
export function createEntity(overrides = {}) {
  const source = safeObject(overrides);
  const position = safeObject(source.position);
  const footprint = safeObject(source.footprint);
  const movement = safeObject(source.movement);
  const path = source.path ? safeObject(source.path) : null;

  return {
    id: safeString(source.id, ""),
    type: safeString(source.type, "unknown"),
    position: {
      x: safeNumber(position.x, 0),
      y: safeNumber(position.y, 0),
      z: safeNumber(position.z, 0),
    },
    previousPosition: source.previousPosition ?? null,
    targetPosition: source.targetPosition ?? null,
    movement: {
      active: Boolean(movement.active),
      speed: safeNumber(movement.speed, 0),
      progress: safeNumber(movement.progress, 0),
    },
    path: path
      ? {
          waypoints: safeArray(path.waypoints).map((point) => {
            const p = safeObject(point);
            return { x: safeNumber(p.x, 0), y: safeNumber(p.y, 0), z: safeNumber(p.z, 0) };
          }),
          speed: safeNumber(path.speed, 0),
        }
      : null,
    footprint: {
      width: safeNumber(footprint.width, 0),
      depth: safeNumber(footprint.depth, 0),
      height: safeNumber(footprint.height, 0),
    },
    state: source.state ?? null,
    activity: source.activity ?? null,
    rotation: safeNumber(source.rotation, 0),
    layer: safeNumber(source.layer, 0),
    metadata: safeObject(source.metadata),
  };
}

// The scene itself: a normalized entity list plus the interaction/camera
// state every isometric view will eventually share (hover, selection, pan/
// zoom). `hoveredEntityId`/`selectedEntityId` reference an entity's `id`,
// never the entity object itself, so the state stays trivially
// serializable.
export function createSceneState(overrides = {}) {
  const source = safeObject(overrides);
  const camera = safeObject(source.camera);

  return {
    entities: safeArray(source.entities).map(createEntity),
    camera: {
      x: safeNumber(camera.x, 0),
      y: safeNumber(camera.y, 0),
      zoom: safeNumber(camera.zoom, 1),
    },
    hoveredEntityId: source.hoveredEntityId ?? null,
    selectedEntityId: source.selectedEntityId ?? null,
  };
}

export function getEntityById(sceneState, id) {
  return safeArray(safeObject(sceneState).entities).find((entity) => entity.id === id) ?? null;
}

export function getEntitiesByType(sceneState, type) {
  return safeArray(safeObject(sceneState).entities).filter((entity) => entity.type === type);
}

const SceneState = { createEntity, createSceneState, getEntityById, getEntitiesByType };
export default SceneState;

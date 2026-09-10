// Moves a scene entity from its current position toward its
// `targetPosition`, one frame at a time. Pure, framework- and domain-
// independent (an "entity" here is just `{position, previousPosition,
// targetPosition, movement}` in world space -- it has no idea whether it's
// a guest, a staff member, or anything hotel-related) -- same reasoning
// IsoProjection.js and DepthSort.js already followed.
//
// Deliberately dumb on purpose for this step: straight-line A -> B only,
// no waypoints, no pathfinding. A future PathfindingService will hand this
// module one leg (one A -> B) at a time, exactly the shape it already
// consumes -- see the step's own "NE PAS encore implémenter le
// pathfinding" note.
import { safeNumber, safeObject } from "../../../lib/safe";

// A movement is frame-rate independent: it tracks *progress* (0..1 along
// the straight-line distance from `previousPosition` to `targetPosition`),
// advanced each tick by `speed * deltaSeconds` converted to a fraction of
// the total distance -- not by a fixed per-frame step. Covering the same
// distance at the same speed therefore takes the same wall-clock time
// whether the engine ticks at 60fps or 30fps (see this module's own
// tests).
export function distanceBetween(a, b) {
  const from = safeObject(a);
  const to = safeObject(b);
  const dx = safeNumber(to.x, 0) - safeNumber(from.x, 0);
  const dy = safeNumber(to.y, 0) - safeNumber(from.y, 0);
  const dz = safeNumber(to.z, 0) - safeNumber(from.z, 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerpPosition(a, b, t) {
  const from = safeObject(a);
  const to = safeObject(b);
  return {
    x: safeNumber(from.x, 0) + (safeNumber(to.x, 0) - safeNumber(from.x, 0)) * t,
    y: safeNumber(from.y, 0) + (safeNumber(to.y, 0) - safeNumber(from.y, 0)) * t,
    z: safeNumber(from.z, 0) + (safeNumber(to.z, 0) - safeNumber(from.z, 0)) * t,
  };
}

// Starts a straight-line movement toward `targetPosition` at `speed`
// (world units per second). `previousPosition` becomes this leg's own
// start point -- the entity's *current* position, not whatever it was
// before its last movement -- so a movement can always be (re)started from
// wherever the entity actually is right now.
export function beginMovement(entity, targetPosition, speed) {
  const source = safeObject(entity);
  const start = { ...safeObject(source.position) };
  return {
    ...source,
    previousPosition: start,
    targetPosition: safeObject(targetPosition),
    movement: { active: true, speed: safeNumber(speed, 0), progress: 0 },
  };
}

// Advances one entity's movement by `deltaSeconds`. Returns the SAME
// object (not a copy) when there's nothing to do (no active movement, or
// no target) so callers can cheaply tell "did anything change?" via
// reference equality (see useSceneEngine.js). Returns a NEW object
// whenever the entity actually moved -- never mutates its input.
export function stepEntityMotion(entity, deltaSeconds) {
  const source = safeObject(entity);
  const movement = safeObject(source.movement);

  if (!movement.active || !source.targetPosition) return source;

  const start = source.previousPosition ?? source.position;
  const target = source.targetPosition;
  const totalDistance = distanceBetween(start, target);

  // Zero-length move (already there, or a degenerate target): snap and
  // stop in one step rather than dividing by zero below.
  if (totalDistance === 0) {
    return {
      ...source,
      position: { ...safeObject(target) },
      previousPosition: { ...safeObject(target) },
      movement: { ...movement, active: false, progress: 1 },
    };
  }

  const speed = safeNumber(movement.speed, 0);
  const previousProgress = safeNumber(movement.progress, 0);
  const traveledDistance = previousProgress * totalDistance + speed * Math.max(0, safeNumber(deltaSeconds, 0));
  const progress = traveledDistance / totalDistance;

  // Arrival: clamp to the exact target, never overshoot, mark the
  // movement finished.
  if (progress >= 1) {
    return {
      ...source,
      position: { ...safeObject(target) },
      previousPosition: { ...safeObject(target) },
      movement: { ...movement, active: false, progress: 1 },
    };
  }

  return {
    ...source,
    position: lerpPosition(start, target, progress),
    movement: { ...movement, progress },
  };
}

const MotionSystem = { distanceBetween, beginMovement, stepEntityMotion };
export default MotionSystem;

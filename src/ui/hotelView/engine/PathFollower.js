// The thin glue between a precomputed list of waypoints (see
// PathfindingService.js) and MotionSystem.js's one-leg-at-a-time movement.
// Deliberately small and framework/domain-independent, same reasoning
// every other engine/ file follows -- it doesn't compute paths (that's
// PathfindingService's job) and it doesn't interpolate positions (that's
// MotionSystem's job); it only remembers "which waypoint am I walking
// toward right now, and what's left after that".
//
// An entity following a path additionally carries:
//   path: { waypoints, speed } | null
// `waypoints` are the REMAINING stops after the one currently being walked
// toward (that one already lives in `targetPosition`, via MotionSystem's
// own fields) -- plain world-space `{x, y, z}` points, so the whole entity
// stays serializable (see SceneState.js's own contract).
import { beginMovement, stepEntityMotion } from "./MotionSystem";
import { safeArray, safeObject } from "../../../lib/safe";

// Starts an entity walking a full path: `waypoints` is the path's
// world-space points EXCLUDING the entity's current position (a path
// straight from PathfindingService.findPath()'s tile output, converted to
// world space and stripped of its own first point, is exactly this
// shape -- see IsoProjection.js's `tileToWorld()`). The first waypoint
// becomes the immediate movement target (via MotionSystem.beginMovement);
// every waypoint after that is kept in `path.waypoints` for
// `stepPath()` to pick up automatically as each leg finishes.
export function beginPath(entity, waypoints, speed) {
  const points = safeArray(waypoints);
  if (points.length === 0) return safeObject(entity);

  const [first, ...rest] = points;
  const moving = beginMovement(entity, first, speed);
  return { ...moving, path: { waypoints: rest, speed } };
}

// Advances one entity by `deltaSeconds`: steps its current leg (via
// MotionSystem.stepEntityMotion) and, if that leg just finished AND more
// waypoints remain, immediately starts the next leg toward them -- all
// within the same tick, so an entity never idles for a frame between two
// legs of the same path. Entities with no `path` (or an exhausted one)
// behave exactly like a plain `stepEntityMotion()` call.
export function stepPath(entity, deltaSeconds) {
  const stepped = stepEntityMotion(entity, deltaSeconds);

  // Still walking toward the current leg's target, or nothing was moving
  // in the first place: nothing left for the path itself to do this tick.
  if (stepped.movement?.active) return stepped;

  const path = stepped.path;
  if (!path || safeArray(path.waypoints).length === 0) return stepped;

  const [next, ...rest] = path.waypoints;
  const moving = beginMovement(stepped, next, path.speed);
  return { ...moving, path: { ...path, waypoints: rest } };
}

const PathFollower = { beginPath, stepPath };
export default PathFollower;

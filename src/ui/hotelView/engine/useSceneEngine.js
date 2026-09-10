// The one place that wires the (React-free) SceneLoop + PathFollower (which
// itself wraps MotionSystem) pair into a React component. Deliberately
// thin: it owns no hotel-domain knowledge, just "run this scene's active
// movements/paths forward and re-render when something actually changed".
import { useCallback, useEffect, useRef, useState } from "react";
import { createSceneLoop } from "./SceneLoop";
import { stepPath } from "./PathFollower";
import { createSceneState } from "./SceneState";

// `initialEntities` is read ONCE, on mount (a lazy `useState` initializer,
// same pattern React itself recommends for expensive/one-time initial
// state) -- this hook is for animating a small, explicitly-handed-in set
// of entities over time, not for re-deriving them from fast-changing props
// every render (that's EntityFactory's/IsoFinalView's job for the static
// business entities; see the step's own "ne branche pas encore tous les
// clients" note).
export function useSceneEngine(initialEntities = []) {
  const [sceneState, setSceneState] = useState(() => createSceneState({ entities: initialEntities }));
  const sceneStateRef = useRef(sceneState);
  const loopRef = useRef(null);

  if (!loopRef.current) {
    loopRef.current = createSceneLoop((deltaSeconds) => {
      // The very first frame after start()/resume() always reports 0 (see
      // SceneLoop.js) -- nothing to step, and stepping here would still
      // allocate new entity objects for no visible change, i.e. an
      // avoidable React re-render on every start/resume.
      if (deltaSeconds <= 0) return;

      const current = sceneStateRef.current;
      let changed = false;
      let anyActive = false;
      const nextEntities = current.entities.map((entity) => {
        if (!entity.movement?.active) return entity;
        // stepPath() steps the current leg (MotionSystem.stepEntityMotion)
        // and, if that leg just finished, automatically starts the next
        // one from entity.path.waypoints (PathFollower.js) -- entities with
        // no path behave exactly like a plain stepEntityMotion() call.
        const stepped = stepPath(entity, deltaSeconds);
        if (stepped !== entity) changed = true;
        if (stepped.movement?.active) anyActive = true;
        return stepped;
      });

      // Nothing moved this frame (no active movement at all, e.g. once
      // every entity has arrived) -- skip the state update entirely so an
      // idle scene never re-renders React just because the clock is still
      // ticking.
      if (changed) {
        const next = { ...current, entities: nextEntities };
        sceneStateRef.current = next;
        setSceneState(next);
      }

      // Every entity has finished moving: pause the loop rather than
      // leaving `requestAnimationFrame` ticking forever for nothing. A
      // future `start()`/`resume()` (e.g. a new movement being kicked off)
      // simply schedules a fresh frame again.
      if (!anyActive) loopRef.current.pause();
    });
  }

  useEffect(() => {
    const loop = loopRef.current;
    return () => loop.stop();
  }, []);

  const start = useCallback(() => loopRef.current.start(), []);
  const pause = useCallback(() => loopRef.current.pause(), []);
  const resume = useCallback(() => loopRef.current.resume(), []);
  const stop = useCallback(() => loopRef.current.stop(), []);
  const isRunning = useCallback(() => loopRef.current.isRunning(), []);

  return { sceneState, start, pause, resume, stop, isRunning };
}

export default useSceneEngine;

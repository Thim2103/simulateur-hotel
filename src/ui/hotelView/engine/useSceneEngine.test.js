import { renderHook, act } from "@testing-library/react";
import { useSceneEngine } from "./useSceneEngine";
import { beginMovement } from "./MotionSystem";
import { beginPath } from "./PathFollower";

// Same fake requestAnimationFrame harness as SceneLoop.test.js -- this
// hook only ever talks to SceneLoop through requestAnimationFrame, so
// driving frames by hand keeps these tests deterministic.
let pending;
let nextId;

beforeEach(() => {
  pending = [];
  nextId = 1;
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextId++;
    pending.push({ id, cb });
    return id;
  });
  jest.spyOn(global, "cancelAnimationFrame").mockImplementation((id) => {
    pending = pending.filter((entry) => entry.id !== id);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function flush(timestamp) {
  const callbacks = pending;
  pending = [];
  callbacks.forEach(({ cb }) => cb(timestamp));
}

function oneMovingEntity() {
  return [beginMovement({ id: "guest-0", type: "character", position: { x: 0, y: 0, z: 0 } }, { x: 10, y: 0, z: 0 }, 5)];
}

describe("useSceneEngine", () => {
  it("exposes the initial entities, untouched, before start()", () => {
    const { result } = renderHook(() => useSceneEngine(oneMovingEntity()));
    expect(result.current.sceneState.entities).toHaveLength(1);
    expect(result.current.sceneState.entities[0].position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("start() progresses the entity's position frame by frame", () => {
    const { result } = renderHook(() => useSceneEngine(oneMovingEntity()));
    act(() => result.current.start());
    act(() => flush(1000)); // first frame: deltaSeconds = 0, no visible change yet
    act(() => flush(1200)); // 200ms later, speed 5 -> 1 world unit covered
    expect(result.current.sceneState.entities[0].position.x).toBeCloseTo(1, 1);
  });

  it("pause() freezes progress in place", () => {
    const { result } = renderHook(() => useSceneEngine(oneMovingEntity()));
    act(() => result.current.start());
    act(() => flush(1000));
    act(() => flush(1200));
    const positionAtPause = result.current.sceneState.entities[0].position.x;

    act(() => result.current.pause());
    // Nothing left to flush (pause cancels the pending frame), so no
    // further progress can happen.
    expect(pending).toHaveLength(0);
    expect(result.current.sceneState.entities[0].position.x).toBeCloseTo(positionAtPause, 5);
  });

  it("resume() continues from exactly where pause() left off, without teleporting", () => {
    const { result } = renderHook(() => useSceneEngine(oneMovingEntity()));
    act(() => result.current.start());
    act(() => flush(1000));
    act(() => flush(1200));
    const positionAtPause = result.current.sceneState.entities[0].position.x;

    act(() => result.current.pause());
    act(() => result.current.resume());
    act(() => flush(50000)); // first frame back: deltaSeconds = 0 (see SceneLoop.js)

    expect(result.current.sceneState.entities[0].position.x).toBeCloseTo(positionAtPause, 5);
  });

  it("stop() halts the loop entirely", () => {
    const { result } = renderHook(() => useSceneEngine(oneMovingEntity()));
    act(() => result.current.start());
    act(() => flush(1000));
    act(() => result.current.stop());
    expect(pending).toHaveLength(0);
    expect(result.current.isRunning()).toBe(false);
  });

  it("pauses the loop by itself once every entity has arrived, instead of ticking forever for nothing", () => {
    // speed 20 covers the 10-unit distance in 0.5s of accumulated deltaSeconds
    // (SceneLoop clamps each individual frame to MAX_DELTA_SECONDS = 0.25s, so
    // this takes two 300ms+ frames rather than one single big jump).
    const { result } = renderHook(() => useSceneEngine([beginMovement({ id: "g", type: "character", position: { x: 0, y: 0, z: 0 } }, { x: 10, y: 0, z: 0 }, 20)]));
    act(() => result.current.start());
    act(() => flush(1000));
    act(() => flush(1300));
    act(() => flush(1600));
    expect(result.current.sceneState.entities[0].position).toEqual({ x: 10, y: 0, z: 0 });
    expect(result.current.sceneState.entities[0].movement.active).toBe(false);
    expect(pending).toHaveLength(0);
    expect(result.current.isRunning()).toBe(false);
  });

  it("walks a multi-waypoint path (A -> B -> C), advancing automatically, and pause/resume mid-path does not teleport", () => {
    // SceneLoop clamps each individual frame's deltaSeconds to 0.25s (see
    // SceneLoop.js's MAX_DELTA_SECONDS) -- every flush below is spaced
    // 300ms apart so each one contributes exactly that clamped 0.25s,
    // making the accumulated distance covered fully predictable.
    const A = { x: 0, y: 0, z: 0 };
    const B = { x: 4, y: 0, z: 0 }; // leg 1: distance 4, speed 4 -> needs 1s (4 clamped frames)
    const C = { x: 4, y: 3, z: 0 }; // leg 2: distance 3, speed 4 -> needs 0.75s (3 clamped frames)
    const entity = beginPath({ id: "guest-0", type: "character", position: A }, [B, C], 4);

    let t = 1000;
    const tick = () => {
      t += 300;
      act(() => flush(t));
    };

    const { result } = renderHook(() => useSceneEngine([entity]));
    act(() => result.current.start());
    act(() => flush(t)); // warm-up frame, dt = 0

    tick(); // leg 1: 0.25s of 1s covered
    expect(result.current.sceneState.entities[0].targetPosition).toEqual(B);
    expect(result.current.sceneState.entities[0].position.x).toBeCloseTo(1, 5);

    // Pause mid-leg: position must freeze exactly where it was.
    act(() => result.current.pause());
    const positionAtPause = result.current.sceneState.entities[0].position;
    expect(pending).toHaveLength(0);

    // Resume: continues from that exact position, no jump.
    act(() => result.current.resume());
    act(() => flush(t + 90000)); // first frame back: dt = 0 (see SceneLoop.js)
    t += 90000;
    expect(result.current.sceneState.entities[0].position).toEqual(positionAtPause);

    tick(); // 0.50s of leg 1 covered
    tick(); // 0.75s of leg 1 covered
    tick(); // leg 1 finishes exactly here -> leg 2 (B -> C) starts, same tick
    expect(result.current.sceneState.entities[0].position).toEqual(B);
    expect(result.current.sceneState.entities[0].targetPosition).toEqual(C);
    expect(result.current.sceneState.entities[0].movement.active).toBe(true);

    tick(); // leg 2: 0.25s of 0.75s covered
    tick(); // 0.50s of 0.75s covered
    tick(); // leg 2 finishes exactly here -> final destination reached

    expect(result.current.sceneState.entities[0].position).toEqual(C);
    expect(result.current.sceneState.entities[0].movement.active).toBe(false);
    expect(result.current.sceneState.entities[0].path.waypoints).toEqual([]);
    expect(result.current.isRunning()).toBe(false); // auto-paused: nothing left to walk
  });

  it("stops the loop on unmount", () => {
    const { result, unmount } = renderHook(() => useSceneEngine(oneMovingEntity()));
    act(() => result.current.start());
    act(() => flush(1000));
    expect(pending).toHaveLength(1);
    unmount();
    expect(pending).toHaveLength(0);
  });
});

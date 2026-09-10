import { beginPath, stepPath } from "./PathFollower";

const A = { x: 0, y: 0, z: 0 };
const B = { x: 4, y: 0, z: 0 };
const C = { x: 4, y: 3, z: 0 };

function entityAt(position) {
  return { id: "e1", type: "character", position };
}

describe("PathFollower / beginPath", () => {
  it("targets the first waypoint immediately, keeping the rest in path.waypoints", () => {
    const started = beginPath(entityAt(A), [B, C], 2);
    expect(started.targetPosition).toEqual(B);
    expect(started.movement).toEqual({ active: true, speed: 2, progress: 0 });
    expect(started.path).toEqual({ waypoints: [C], speed: 2 });
  });

  it("an empty waypoint list leaves the entity untouched", () => {
    const entity = entityAt(A);
    expect(beginPath(entity, [], 2)).toBe(entity);
  });
});

describe("PathFollower / stepPath -- A -> B -> C", () => {
  it("walks leg 1 (A -> B) without touching the remaining waypoints yet", () => {
    let entity = beginPath(entityAt(A), [B, C], 4); // distance A->B = 4, speed 4 -> 1s to arrive
    entity = stepPath(entity, 0.5); // halfway
    expect(entity.position.x).toBeCloseTo(2);
    expect(entity.movement.active).toBe(true);
    expect(entity.path.waypoints).toEqual([C]);
  });

  it("automatically advances to the next waypoint (B -> C) the instant leg 1 finishes, same tick", () => {
    let entity = beginPath(entityAt(A), [B, C], 4);
    entity = stepPath(entity, 1); // exactly finishes leg 1 (A -> B)
    expect(entity.position).toEqual(B); // arrived at B...
    expect(entity.targetPosition).toEqual(C); // ...and already walking toward C
    expect(entity.movement.active).toBe(true);
    expect(entity.path.waypoints).toEqual([]);
  });

  it("reaches the final destination and stops there, with no waypoints left", () => {
    let entity = beginPath(entityAt(A), [B, C], 4);
    for (let step = 0; step < 20; step += 1) {
      entity = stepPath(entity, 0.25);
    }
    expect(entity.position).toEqual(C);
    expect(entity.movement.active).toBe(false);
    expect(entity.path.waypoints).toEqual([]);
  });

  it("never overshoots the current leg's target, even with a very large deltaSeconds", () => {
    // A single stepPath() call advances (at most) one leg -- exactly the
    // same "clamp to the target, never past it" guarantee
    // MotionSystem.stepEntityMotion already gives one leg at a time (see
    // MotionSystem.test.js); a huge frame lands exactly on B, already
    // walking toward C, rather than skipping past it.
    let entity = beginPath(entityAt(A), [B, C], 4);
    entity = stepPath(entity, 1000); // one huge frame
    expect(entity.position).toEqual(B);
    expect(entity.targetPosition).toEqual(C);
    expect(entity.movement.active).toBe(true);

    entity = stepPath(entity, 1000); // another huge frame: finishes leg 2
    expect(entity.position).toEqual(C);
    expect(entity.movement.active).toBe(false);
  });

  it("a finished path (no more waypoints, movement inactive) is returned unchanged", () => {
    let entity = beginPath(entityAt(A), [B], 4);
    entity = stepPath(entity, 1000); // arrives at B, no waypoints left
    const settled = entity;
    expect(stepPath(settled, 1)).toBe(settled);
  });

  it("an entity with no path at all behaves exactly like a plain movement", () => {
    const moving = { id: "e1", position: A, previousPosition: A, targetPosition: B, movement: { active: true, speed: 4, progress: 0 } };
    const stepped = stepPath(moving, 1);
    expect(stepped.position).toEqual(B);
    expect(stepped.movement.active).toBe(false);
  });
});

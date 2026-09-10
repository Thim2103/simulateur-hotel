import { distanceBetween, beginMovement, stepEntityMotion } from "./MotionSystem";
import { worldToScreen } from "./IsoProjection";
import { sortEntitiesByDepth } from "./DepthSort";

function movingEntity({ from, to, speed, progress = 0 }) {
  return {
    id: "e1",
    type: "character",
    position: from,
    previousPosition: from,
    targetPosition: to,
    movement: { active: true, speed, progress },
  };
}

describe("MotionSystem / beginMovement", () => {
  it("sets previousPosition to the entity's current position, and starts an active movement at progress 0", () => {
    const entity = { id: "e1", position: { x: 2, y: 2, z: 0 } };
    const started = beginMovement(entity, { x: 8, y: 5, z: 0 }, 3);
    expect(started.previousPosition).toEqual({ x: 2, y: 2, z: 0 });
    expect(started.targetPosition).toEqual({ x: 8, y: 5, z: 0 });
    expect(started.movement).toEqual({ active: true, speed: 3, progress: 0 });
    // position itself is untouched until the loop actually steps it
    expect(started.position).toEqual({ x: 2, y: 2, z: 0 });
  });
});

describe("MotionSystem / stepEntityMotion", () => {
  it("start === target: snaps immediately, no movement needed", () => {
    const entity = movingEntity({ from: { x: 3, y: 3, z: 0 }, to: { x: 3, y: 3, z: 0 }, speed: 2 });
    const stepped = stepEntityMotion(entity, 1);
    expect(stepped.position).toEqual({ x: 3, y: 3, z: 0 });
    expect(stepped.movement.active).toBe(false);
    expect(stepped.movement.progress).toBe(1);
  });

  it("positive displacement along both axes", () => {
    const entity = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 0 }, speed: 2 });
    const stepped = stepEntityMotion(entity, 1); // 2 units covered of 10
    expect(stepped.position.x).toBeCloseTo(2);
    expect(stepped.movement.progress).toBeCloseTo(0.2);
    expect(stepped.movement.active).toBe(true);
  });

  it("negative displacement (moving back toward the origin)", () => {
    const entity = movingEntity({ from: { x: 10, y: 0, z: 0 }, to: { x: 0, y: 0, z: 0 }, speed: 2 });
    const stepped = stepEntityMotion(entity, 1);
    expect(stepped.position.x).toBeCloseTo(8);
  });

  it("movement on X only", () => {
    const entity = movingEntity({ from: { x: 0, y: 4, z: 0 }, to: { x: 8, y: 4, z: 0 }, speed: 2 });
    const stepped = stepEntityMotion(entity, 1);
    expect(stepped.position.y).toBe(4);
    expect(stepped.position.x).toBeCloseTo(2);
  });

  it("movement on Y only", () => {
    const entity = movingEntity({ from: { x: 4, y: 0, z: 0 }, to: { x: 4, y: 8, z: 0 }, speed: 2 });
    const stepped = stepEntityMotion(entity, 1);
    expect(stepped.position.x).toBe(4);
    expect(stepped.position.y).toBeCloseTo(2);
  });

  it("combined X/Y movement interpolates along the straight line", () => {
    const entity = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 6, y: 8, z: 0 }, speed: 5 }); // distance = 10
    const stepped = stepEntityMotion(entity, 1); // 5 of 10 units -> progress 0.5
    expect(stepped.movement.progress).toBeCloseTo(0.5);
    expect(stepped.position.x).toBeCloseTo(3);
    expect(stepped.position.y).toBeCloseTo(4);
  });

  it("a higher speed covers more distance in the same deltaSeconds", () => {
    const slow = stepEntityMotion(movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 0 }, speed: 1 }), 1);
    const fast = stepEntityMotion(movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 0 }, speed: 5 }), 1);
    expect(fast.position.x).toBeGreaterThan(slow.position.x);
  });

  it("frame-rate independence: 60fps (many small steps) and 30fps (fewer, bigger steps) cover the same distance over the same wall-clock time", () => {
    const distance = 12;
    const speed = 6; // 2 seconds total to arrive
    const totalSeconds = 1; // check the midpoint, well before arrival

    let at60fps = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: distance, y: 0, z: 0 }, speed });
    const dt60 = 1 / 60;
    for (let step = 0; step < 60 * totalSeconds; step += 1) {
      at60fps = stepEntityMotion(at60fps, dt60);
    }

    let at30fps = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: distance, y: 0, z: 0 }, speed });
    const dt30 = 1 / 30;
    for (let step = 0; step < 30 * totalSeconds; step += 1) {
      at30fps = stepEntityMotion(at30fps, dt30);
    }

    expect(at60fps.position.x).toBeCloseTo(at30fps.position.x, 5);
    expect(at60fps.position.x).toBeCloseTo(speed * totalSeconds, 5);
  });

  it("arrives exactly at the destination once enough distance has been covered", () => {
    const entity = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 0 }, speed: 4 });
    const stepped = stepEntityMotion(entity, 1); // exactly covers the 4-unit distance
    expect(stepped.position).toEqual({ x: 4, y: 0, z: 0 });
    expect(stepped.movement.active).toBe(false);
  });

  it("never overshoots the target, even with a very large deltaSeconds", () => {
    const entity = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 4, y: 0, z: 0 }, speed: 4 });
    const stepped = stepEntityMotion(entity, 100);
    expect(stepped.position).toEqual({ x: 4, y: 0, z: 0 });
    expect(stepped.movement.progress).toBe(1);
  });

  it("a finished (inactive) entity is returned unchanged (same reference)", () => {
    const entity = { id: "e1", position: { x: 4, y: 0, z: 0 }, targetPosition: { x: 4, y: 0, z: 0 }, movement: { active: false, speed: 4, progress: 1 } };
    expect(stepEntityMotion(entity, 1)).toBe(entity);
  });

  it("an entity with no targetPosition is returned unchanged", () => {
    const entity = { id: "e1", position: { x: 0, y: 0, z: 0 }, movement: { active: true, speed: 1, progress: 0 } };
    expect(stepEntityMotion(entity, 1)).toBe(entity);
  });
});

describe("MotionSystem / distanceBetween", () => {
  it("computes straight-line distance in 3D world space", () => {
    expect(distanceBetween({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
  });
});

describe("MotionSystem / integration with IsoProjection", () => {
  it("a stepped world position projects to a screen position via IsoProjection.worldToScreen", () => {
    const entity = movingEntity({ from: { x: 0, y: 0, z: 0 }, to: { x: 10, y: 0, z: 0 }, speed: 5 });
    const stepped = stepEntityMotion(entity, 1); // world x = 5
    const params = { tileWidth: 64, tileHeight: 32, elevationHeight: 32, originX: 0, originY: 0, scale: 1 };
    const screen = worldToScreen(stepped.position, params);
    expect(screen).toEqual({ x: 5 * (64 / 2), y: 5 * (32 / 2) });
  });
});

describe("MotionSystem / integration with DepthSort", () => {
  it("a moving character's draw order relative to a fixed room changes as it walks from behind it to in front of it", () => {
    const room = { id: "room", x: 4, y: 4, z: 0, width: 0, depth: 0, height: 0 };
    let character = beginMovement({ id: "character", x: 0, y: 0, z: 0, position: { x: 0, y: 0, z: 0 } }, { x: 8, y: 8, z: 0 }, 4);

    // Far behind the room (lower x+y draws first -> visually behind it).
    let sorted = sortEntitiesByDepth([{ ...room }, { id: character.id, x: character.position.x, y: character.position.y, z: character.position.z }]);
    expect(sorted.map((e) => e.id)).toEqual(["character", "room"]);

    // Step forward until the character has passed the room's own depth key
    // (x + y = 8) and is now nearer the camera.
    for (let step = 0; step < 60; step += 1) {
      character = stepEntityMotion(character, 1 / 10);
    }
    expect(character.position.x + character.position.y).toBeGreaterThan(room.x + room.y);

    // Now drawn last -> visually in front of the room.
    sorted = sortEntitiesByDepth([{ ...room }, { id: character.id, x: character.position.x, y: character.position.y, z: character.position.z }]);
    expect(sorted.map((e) => e.id)).toEqual(["room", "character"]);
  });
});

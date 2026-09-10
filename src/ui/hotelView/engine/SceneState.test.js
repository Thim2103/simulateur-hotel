import { createEntity, createSceneState, getEntityById, getEntitiesByType } from "./SceneState";

describe("SceneState / createEntity", () => {
  it("normalizes a minimal entity with generic defaults", () => {
    const entity = createEntity({ id: "room:1", type: "room" });
    expect(entity).toEqual({
      id: "room:1",
      type: "room",
      position: { x: 0, y: 0, z: 0 },
      previousPosition: null,
      targetPosition: null,
      movement: { active: false, speed: 0, progress: 0 },
      path: null,
      footprint: { width: 0, depth: 0, height: 0 },
      state: null,
      activity: null,
      rotation: 0,
      layer: 0,
      metadata: {},
    });
  });

  it("keeps a fully-specified entity's fields", () => {
    const entity = createEntity({
      id: "character:guest:0",
      type: "character",
      position: { x: 1.5, y: 2, z: 0 },
      footprint: { width: 1, depth: 1, height: 2 },
      state: "present",
      activity: "walking",
      rotation: 90,
      layer: 1,
      metadata: { kind: "guest" },
    });
    expect(entity.position).toEqual({ x: 1.5, y: 2, z: 0 });
    expect(entity.footprint).toEqual({ width: 1, depth: 1, height: 2 });
    expect(entity.state).toBe("present");
    expect(entity.activity).toBe("walking");
    expect(entity.rotation).toBe(90);
    expect(entity.layer).toBe(1);
    expect(entity.metadata).toEqual({ kind: "guest" });
  });

  it("never throws on malformed input", () => {
    expect(() => createEntity(null)).not.toThrow();
    expect(() => createEntity(undefined)).not.toThrow();
    expect(() => createEntity({ position: null, footprint: "not-an-object" })).not.toThrow();
    expect(() => createEntity({ movement: "not-an-object" })).not.toThrow();
  });

  it("normalizes a movement in progress, and stays plain/serializable", () => {
    const entity = createEntity({
      id: "character:guest:0",
      type: "character",
      position: { x: 1, y: 1, z: 0 },
      previousPosition: { x: 0, y: 0, z: 0 },
      targetPosition: { x: 5, y: 5, z: 0 },
      movement: { active: true, speed: 2, progress: 0.25 },
    });
    expect(entity.movement).toEqual({ active: true, speed: 2, progress: 0.25 });
    expect(entity.previousPosition).toEqual({ x: 0, y: 0, z: 0 });
    expect(entity.targetPosition).toEqual({ x: 5, y: 5, z: 0 });
    expect(() => JSON.stringify(entity)).not.toThrow();
    for (const value of Object.values(entity)) {
      expect(typeof value).not.toBe("function");
    }
  });

  it("normalizes a multi-waypoint path, and defaults it to null", () => {
    const withoutPath = createEntity({ id: "a", type: "character" });
    expect(withoutPath.path).toBeNull();

    const withPath = createEntity({
      id: "a",
      type: "character",
      path: { waypoints: [{ x: 1, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }], speed: 2 },
    });
    expect(withPath.path).toEqual({ waypoints: [{ x: 1, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }], speed: 2 });
    expect(() => JSON.stringify(withPath)).not.toThrow();
  });
});

describe("SceneState / createSceneState", () => {
  it("produces the documented shape with sensible defaults", () => {
    const scene = createSceneState();
    expect(scene).toEqual({
      entities: [],
      camera: { x: 0, y: 0, zoom: 1 },
      hoveredEntityId: null,
      selectedEntityId: null,
    });
  });

  it("normalizes every entity in the list", () => {
    const scene = createSceneState({ entities: [{ id: "a", type: "room" }, { id: "b", type: "character" }] });
    expect(scene.entities).toHaveLength(2);
    expect(scene.entities[0].id).toBe("a");
    expect(scene.entities[1].id).toBe("b");
  });

  it("normalizes camera and interaction fields", () => {
    const scene = createSceneState({ camera: { x: 10, y: -5, zoom: 2 }, hoveredEntityId: "room:1", selectedEntityId: "room:2" });
    expect(scene.camera).toEqual({ x: 10, y: -5, zoom: 2 });
    expect(scene.hoveredEntityId).toBe("room:1");
    expect(scene.selectedEntityId).toBe("room:2");
  });

  it("never throws on malformed input", () => {
    expect(() => createSceneState(null)).not.toThrow();
    expect(() => createSceneState({ entities: "not-an-array", camera: null })).not.toThrow();
  });

  it("is a plain, JSON-serializable object", () => {
    const scene = createSceneState({ entities: [{ id: "a", type: "room" }] });
    expect(() => JSON.stringify(scene)).not.toThrow();
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });
});

describe("SceneState / accessors", () => {
  const scene = createSceneState({
    entities: [
      { id: "room:1", type: "room" },
      { id: "room:2", type: "room" },
      { id: "character:guest:0", type: "character" },
    ],
  });

  it("getEntityById finds an entity by its stable id", () => {
    expect(getEntityById(scene, "room:2").type).toBe("room");
    expect(getEntityById(scene, "does-not-exist")).toBeNull();
  });

  it("getEntitiesByType filters by generic type", () => {
    expect(getEntitiesByType(scene, "room")).toHaveLength(2);
    expect(getEntitiesByType(scene, "character")).toHaveLength(1);
    expect(getEntitiesByType(scene, "incident")).toEqual([]);
  });

  it("accessors never throw on malformed scene state", () => {
    expect(() => getEntityById(null, "x")).not.toThrow();
    expect(() => getEntitiesByType(undefined, "room")).not.toThrow();
  });
});

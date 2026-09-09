import { buildHotelSceneEntities, computeFloors } from "./EntityFactory";

function room(id, overrides = {}) {
  return { id, number: `10${id}`, status: "libre", housekeeping_status: "clean", ...overrides };
}

describe("EntityFactory / room states", () => {
  it("maps a clean room", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)] });
    const roomEntity = entities.find((e) => e.type === "room");
    expect(roomEntity.state).toBe("clean");
  });

  it("maps a dirty room", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1, { housekeeping_status: "dirty" })] });
    expect(entities.find((e) => e.type === "room").state).toBe("dirty");
  });

  it("maps an occupied room", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1, { status: "occupée" })] });
    expect(entities.find((e) => e.type === "room").state).toBe("occupied");
  });

  it("maps a cleaning room (cleaningRoomIds takes priority over status/housekeeping)", () => {
    const entities = buildHotelSceneEntities({
      rooms: [room(1, { status: "occupée", housekeeping_status: "dirty" })],
      cleaningRoomIds: new Set([1]),
    });
    expect(entities.find((e) => e.type === "room").state).toBe("cleaning");
  });
});

describe("EntityFactory / stable ids", () => {
  it("gives the same room the same id across two independent calls", () => {
    const props = { rooms: [room(1), room(2), room(3)] };
    const first = buildHotelSceneEntities(props);
    const second = buildHotelSceneEntities({ rooms: [room(1), room(2), room(3)] });
    const firstIds = first.filter((e) => e.type === "room").map((e) => e.id);
    const secondIds = second.filter((e) => e.type === "room").map((e) => e.id);
    expect(firstIds).toEqual(secondIds);
  });

  it("does not rely on array index alone: reordering business rooms keeps each room's own id", () => {
    const original = buildHotelSceneEntities({ rooms: [room(1), room(2)] }).filter((e) => e.type === "room");
    const reordered = buildHotelSceneEntities({ rooms: [room(2), room(1)] }).filter((e) => e.type === "room");
    const originalById = Object.fromEntries(original.map((e) => [e.id, e]));
    const reorderedById = Object.fromEntries(reordered.map((e) => [e.id, e]));
    expect(Object.keys(originalById).sort()).toEqual(Object.keys(reorderedById).sort());
    expect(originalById["room:1"]).toBeDefined();
    expect(originalById["room:2"]).toBeDefined();
  });

  it("gives characters stable ids across two independent calls with the same input", () => {
    const props = { rooms: [room(1, { status: "occupée" })], staffCount: 2 };
    const first = buildHotelSceneEntities(props).filter((e) => e.type === "character");
    const second = buildHotelSceneEntities({ rooms: [room(1, { status: "occupée" })], staffCount: 2 }).filter((e) => e.type === "character");
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
  });
});

describe("EntityFactory / positions", () => {
  it("gives the same layout the same positions", () => {
    const props = { rooms: [room(1), room(2)] };
    const a = buildHotelSceneEntities(props).filter((e) => e.type === "room");
    const b = buildHotelSceneEntities({ rooms: [room(1), room(2)] }).filter((e) => e.type === "room");
    expect(a.map((e) => e.position)).toEqual(b.map((e) => e.position));
  });

  it("places different rooms at different positions", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1), room(2), room(3)] }).filter((e) => e.type === "room");
    const positions = entities.map((e) => `${e.position.x},${e.position.y},${e.position.z}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("gives rooms on different floors a different z (elevation)", () => {
    // 8 rooms over 4 floors -> 2 rooms per floor, so index 0 and index 2
    // land on different floors.
    const rooms = Array.from({ length: 8 }, (_, i) => room(i + 1));
    const entities = buildHotelSceneEntities({ rooms }).filter((e) => e.type === "room");
    const firstFloorRoom = entities[0];
    const secondFloorRoom = entities.find((e) => e.position.z !== firstFloorRoom.position.z);
    expect(secondFloorRoom).toBeDefined();
  });
});

describe("EntityFactory / missing data", () => {
  it("handles an empty rooms list", () => {
    expect(() => buildHotelSceneEntities({ rooms: [] })).not.toThrow();
    const entities = buildHotelSceneEntities({ rooms: [] });
    expect(entities.filter((e) => e.type === "room")).toEqual([]);
  });

  it("handles empty todaysEvents/diagnostics and absent decisionFeedback", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)], todaysEvents: [], diagnostics: [], decisionFeedback: undefined });
    expect(entities.filter((e) => e.type === "incident")).toEqual([]);
  });

  it("handles fully empty/undefined props without throwing", () => {
    expect(() => buildHotelSceneEntities()).not.toThrow();
    expect(() => buildHotelSceneEntities({})).not.toThrow();
    expect(buildHotelSceneEntities({})).toEqual(expect.any(Array));
  });
});

describe("EntityFactory / staff", () => {
  it("produces no staff characters when staffCount is 0", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)], staffCount: 0 });
    expect(entities.filter((e) => e.metadata?.kind === "staff")).toEqual([]);
  });

  it("produces staff characters when staffCount > 0", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)], staffCount: 3 });
    expect(entities.filter((e) => e.metadata?.kind === "staff")).toHaveLength(3);
  });
});

describe("EntityFactory / incidents", () => {
  it("produces one incident entity for one qualifying diagnostic", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)], diagnostics: [{ type: "error", message: "Panne" }] });
    expect(entities.filter((e) => e.type === "incident")).toHaveLength(1);
  });

  it("produces several incident entities for several qualifying diagnostics", () => {
    const entities = buildHotelSceneEntities({
      rooms: [room(1)],
      diagnostics: [
        { type: "error", message: "Panne cuisine" },
        { severity: "high", message: "Fuite d'eau" },
        { type: "anomaly", severity: "low", message: "Ignoré" },
      ],
    });
    expect(entities.filter((e) => e.type === "incident")).toHaveLength(2);
  });
});

describe("EntityFactory / separation from raw business data", () => {
  it("never leaks the full business room/diagnostic objects onto an entity", () => {
    const entities = buildHotelSceneEntities({
      rooms: [room(1, { status: "occupée", housekeeping_status: "dirty" })],
      diagnostics: [{ type: "error", severity: "high", message: "Panne" }],
    });
    for (const entity of entities) {
      expect(entity.status).toBeUndefined();
      expect(entity.housekeeping_status).toBeUndefined();
      expect(entity.severity).toBeUndefined();
      expect(entity).not.toHaveProperty("__item");
    }
  });

  it("only exposes a small, generic metadata bag, not the raw diagnostic object", () => {
    const entities = buildHotelSceneEntities({ rooms: [room(1)], diagnostics: [{ type: "error", severity: "high", message: "Panne", extraInternalField: 42 }] });
    const incident = entities.find((e) => e.type === "incident");
    expect(incident.metadata).toEqual({ incidentType: "breakdown", message: "Panne" });
    expect(incident.metadata.extraInternalField).toBeUndefined();
  });
});

describe("EntityFactory / computeFloors", () => {
  it("groups rooms into floors deterministically", () => {
    const rooms = Array.from({ length: 8 }, (_, i) => room(i + 1));
    const floors = computeFloors(rooms);
    expect(floors.length).toBeGreaterThan(0);
    expect(floors.reduce((sum, f) => sum + f.rooms.length, 0)).toBe(8);
  });

  it("handles an empty rooms list", () => {
    expect(computeFloors([])).toEqual([]);
  });
});

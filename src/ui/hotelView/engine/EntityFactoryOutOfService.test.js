import { buildHotelSceneEntities } from "./EntityFactory";

const room = (id, number, status) => ({ id, number, type: "standard", status, housekeeping_status: "clean", price: 120, capacity: 2 });
const build = (rooms) => buildHotelSceneEntities({ rooms, staffCount: 0, diagnostics: [], cleaningRoomIds: new Set() }).filter((entity) => entity.type === "room");

describe("EntityFactory / rooms out of service", () => {
  it.each(["maintenance", "hors_service"])("flags a room whose status is %s", (status) => {
    const [entity] = build([room(1, "101", status)]);
    expect(entity.metadata.outOfService).toBe(true);
  });

  it("adds the flag only when true, like vip and meeting", () => {
    const entities = build([room(1, "101", "libre"), room(2, "102", "occupée")]);
    entities.forEach((entity) => expect(entity.metadata).not.toHaveProperty("outOfService"));
  });

  it("does not change the room's generic state", () => {
    const [entity] = build([room(1, "101", "maintenance")]);
    expect(entity.state).toBe("clean");
  });
});

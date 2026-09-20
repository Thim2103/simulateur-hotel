import {
  BASE_FLOORS,
  MAX_NEW_FLOORS,
  FLOOR_BASE_COST,
  FLOOR_COST_STEP,
  CONSTRUCTION_DAYS,
  SLOTS_PER_FLOOR,
  ROOM_KINDS,
  isExpansionRoom,
  expansionFloors,
  floorUnderConstruction,
  builtFloors,
  nextFloorLevel,
  nextFloorCost,
  floorConstructionStatus,
  roomsOnFloor,
  freeSlots,
  expansionRoomCount,
  fitOutStatus,
  startFloorConstruction,
  fitOutRooms,
  advanceExpansion,
  floorsCompletedOn,
  constructionSatisfactionPenalty,
} from "./hotelExpansionEngine";
import { FLOOR_COUNT } from "../../ui/hotelView/scene/HotelSceneLayout";

const baseRooms = [
  { id: 1, number: "101", type: "standard", price: 100, floor: 1 },
  { id: 2, number: "102", type: "standard", price: 140, floor: 1 },
  { id: 3, number: "201", type: "deluxe", price: 200, floor: 2 },
];
const bundle = ({ capital = 500000, rooms = baseRooms, hotelState = {} } = {}) => ({ hotelState: { expansion: { availableCapital: capital }, ...hotelState }, rooms });

// A hotel whose floor 5 is already built.
const withBuiltFloor = (extra = {}) => {
  let b = startFloorConstruction(bundle(extra), { day: 0 });
  b = { ...b, hotelState: advanceExpansion(b.hotelState, CONSTRUCTION_DAYS) };
  return b;
};

describe("hotelExpansionEngine / constants", () => {
  it("the new floors sit above the floors the schematic view already draws", () => {
    expect(BASE_FLOORS).toBe(FLOOR_COUNT);
  });
});

describe("hotelExpansionEngine / an untouched hotel", () => {
  it("has no new floor, no works, no penalty", () => {
    const state = bundle().hotelState;
    expect(expansionFloors(state)).toEqual([]);
    expect(floorUnderConstruction(state)).toBeNull();
    expect(constructionSatisfactionPenalty(state)).toBe(0);
    expect(expansionRoomCount(baseRooms)).toBe(0);
  });

  it("the first new floor is the one above the base building, at the base price", () => {
    const state = bundle().hotelState;
    expect(nextFloorLevel(state)).toBe(BASE_FLOORS + 1);
    expect(nextFloorCost(state)).toBe(FLOOR_BASE_COST);
    expect(floorConstructionStatus(state)).toBe("available");
  });

  it("copes with a missing state", () => {
    expect(expansionFloors(undefined)).toEqual([]);
    expect(advanceExpansion(undefined, 3)).toBeUndefined();
    expect(startFloorConstruction(undefined)).toEqual({});
  });
});

describe("hotelExpansionEngine / building a floor", () => {
  it("pays the cost and starts a five-day construction", () => {
    const result = startFloorConstruction(bundle(), { day: 3 });
    expect(result.hotelState.expansion.availableCapital).toBe(500000 - FLOOR_BASE_COST);
    expect(result.hotelState.buildingExpansion.floors[5]).toEqual({ status: "building", startedOnDay: 3, completesOnDay: 3 + CONSTRUCTION_DAYS });
    expect(floorUnderConstruction(result.hotelState).level).toBe(5);
  });

  it("does not add any room by itself", () => {
    expect(startFloorConstruction(bundle(), { day: 0 }).rooms).toEqual(baseRooms);
  });

  it("only one floor at a time", () => {
    const started = startFloorConstruction(bundle(), { day: 0 });
    expect(floorConstructionStatus(started.hotelState)).toBe("in-progress");
    expect(startFloorConstruction(started, { day: 1 })).toBe(started);
  });

  it("is refused, changing nothing, when the funds are short", () => {
    const poor = bundle({ capital: 1000 });
    expect(floorConstructionStatus(poor.hotelState)).toBe("no-funds");
    expect(startFloorConstruction(poor, { day: 0 })).toBe(poor);
  });

  it("the treasury makes up for a short capital", () => {
    const b = bundle({ capital: 100000, hotelState: { finance: { revenue: [80000], costs: [0] } } });
    const result = startFloorConstruction(b, { day: 0 });
    expect(result.hotelState.expansion.availableCapital).toBe(0);
    expect(result.hotelState.finance.costs).toEqual([50000]);
    expect(floorUnderConstruction(result.hotelState)).not.toBeNull();
  });

  it("noise costs guest satisfaction while the works last, and stops after", () => {
    const started = startFloorConstruction(bundle(), { day: 0 });
    expect(constructionSatisfactionPenalty(started.hotelState)).toBeGreaterThan(0);
    expect(constructionSatisfactionPenalty(advanceExpansion(started.hotelState, CONSTRUCTION_DAYS))).toBe(0);
  });
});

describe("hotelExpansionEngine / daily progress", () => {
  it("leaves a hotel with nothing under construction untouched", () => {
    const state = bundle().hotelState;
    expect(advanceExpansion(state, 9)).toBe(state);
  });

  it("does nothing before the works day", () => {
    const started = startFloorConstruction(bundle(), { day: 0 });
    expect(advanceExpansion(started.hotelState, CONSTRUCTION_DAYS - 1)).toBe(started.hotelState);
  });

  it("completes the floor on its day, and logs it", () => {
    const started = startFloorConstruction(bundle(), { day: 0 });
    const done = advanceExpansion(started.hotelState, CONSTRUCTION_DAYS);
    expect(builtFloors(done)).toHaveLength(1);
    expect(builtFloors(done)[0]).toMatchObject({ level: 5, status: "built", builtOnDay: CONSTRUCTION_DAYS });
    expect(floorUnderConstruction(done)).toBeNull();
    expect(floorsCompletedOn(done, CONSTRUCTION_DAYS)).toEqual([{ level: 5, day: CONSTRUCTION_DAYS }]);
    expect(floorsCompletedOn(done, 1)).toEqual([]);
  });

  it("completes a floor whose day was skipped over", () => {
    const started = startFloorConstruction(bundle(), { day: 0 });
    expect(builtFloors(advanceExpansion(started.hotelState, 40))).toHaveLength(1);
  });
});

describe("hotelExpansionEngine / successive floors", () => {
  it("each floor costs a step more, and the levels go up", () => {
    let b = withBuiltFloor();
    expect(nextFloorLevel(b.hotelState)).toBe(6);
    expect(nextFloorCost(b.hotelState)).toBe(FLOOR_BASE_COST + FLOOR_COST_STEP);
    const before = b.hotelState.expansion.availableCapital;
    b = startFloorConstruction(b, { day: 10 });
    expect(before - b.hotelState.expansion.availableCapital).toBe(FLOOR_BASE_COST + FLOOR_COST_STEP);
    expect(floorUnderConstruction(b.hotelState).level).toBe(6);
  });

  it("the building has a height limit", () => {
    let b = bundle({ capital: 5000000 });
    for (let i = 0; i < MAX_NEW_FLOORS; i += 1) {
      b = startFloorConstruction(b, { day: i * 10 });
      b = { ...b, hotelState: advanceExpansion(b.hotelState, i * 10 + CONSTRUCTION_DAYS) };
    }
    expect(expansionFloors(b.hotelState)).toHaveLength(MAX_NEW_FLOORS);
    expect(floorConstructionStatus(b.hotelState)).toBe("max");
    expect(startFloorConstruction(b, { day: 99 })).toBe(b);
  });
});

describe("hotelExpansionEngine / fitting out rooms", () => {
  it("can't fit out a floor that isn't built (or doesn't exist)", () => {
    expect(fitOutStatus(bundle(), 5, "standard")).toBe("not-built");
    const started = startFloorConstruction(bundle(), { day: 0 });
    expect(fitOutStatus(started, 5, "standard")).toBe("not-built");
    expect(fitOutRooms(started, 5, "standard")).toBe(started);
  });

  it("adds a room to the hotel's own room list, free and clean, tagged with its floor", () => {
    const result = fitOutRooms(withBuiltFloor(), 5, "deluxe");
    expect(result.rooms).toHaveLength(baseRooms.length + 1);
    const room = result.rooms[result.rooms.length - 1];
    expect(room).toMatchObject({ number: "501", type: "deluxe", floor: 5, capacity: ROOM_KINDS.deluxe.capacity, status: "libre", housekeeping_status: "clean", metadata: { expansionFloor: 5 } });
    expect(isExpansionRoom(room)).toBe(true);
    expect(isExpansionRoom(baseRooms[0])).toBe(false);
  });

  it("gives it a unique id and the next room number", () => {
    let b = fitOutRooms(withBuiltFloor(), 5, "standard");
    b = fitOutRooms(b, 5, "suite");
    const [first, second] = b.rooms.slice(-2);
    expect(first.id).not.toBe(second.id);
    expect(new Set(b.rooms.map((room) => room.id)).size).toBe(b.rooms.length);
    expect([first.number, second.number]).toEqual(["501", "502"]);
  });

  it("prices it like the hotel's other rooms of that kind (average), else the default", () => {
    const b = withBuiltFloor();
    expect(fitOutRooms(b, 5, "standard").rooms.slice(-1)[0].price).toBe(120); // (100 + 140) / 2
    expect(fitOutRooms(b, 5, "suite").rooms.slice(-1)[0].price).toBe(ROOM_KINDS.suite.defaultPrice);
  });

  it("pays the room's cost", () => {
    const b = withBuiltFloor();
    const before = b.hotelState.expansion.availableCapital;
    expect(before - fitOutRooms(b, 5, "suite").hotelState.expansion.availableCapital).toBe(ROOM_KINDS.suite.cost);
  });

  it("can fit out several at once, at the summed cost", () => {
    const b = withBuiltFloor();
    const result = fitOutRooms(b, 5, "standard", 3);
    expect(result.rooms).toHaveLength(baseRooms.length + 3);
    expect(b.hotelState.expansion.availableCapital - result.hotelState.expansion.availableCapital).toBe(3 * ROOM_KINDS.standard.cost);
    expect(roomsOnFloor(result.rooms, 5).map((room) => room.number)).toEqual(["501", "502", "503"]);
  });

  it("a floor holds a limited number of rooms", () => {
    let b = fitOutRooms(withBuiltFloor(), 5, "standard", SLOTS_PER_FLOOR);
    expect(freeSlots(b.rooms, 5)).toBe(0);
    expect(fitOutStatus(b, 5, "standard")).toBe("floor-full");
    expect(fitOutRooms(b, 5, "standard")).toBe(b);
    b = withBuiltFloor();
    expect(fitOutRooms(b, 5, "standard", SLOTS_PER_FLOOR + 1)).toBe(b);
  });

  it("is refused when the funds are short, changing nothing", () => {
    const b = withBuiltFloor({ capital: FLOOR_BASE_COST + 5000 });
    expect(fitOutStatus(b, 5, "standard")).toBe("no-funds");
    expect(fitOutRooms(b, 5, "standard")).toBe(b);
  });

  it("rejects an unknown kind and a bad count", () => {
    const b = withBuiltFloor();
    expect(fitOutStatus(b, 5, "penthouse")).toBe("unknown-kind");
    expect(fitOutRooms(b, 5, "penthouse")).toBe(b);
    expect(fitOutRooms(b, 5, "standard", 0)).toBe(b);
    expect(fitOutRooms(b, 5, "standard", 1.5)).toBe(b);
  });

  it("counts the capacity it adds", () => {
    const result = fitOutRooms(withBuiltFloor(), 5, "standard", 4);
    expect(expansionRoomCount(result.rooms)).toBe(4);
  });

  it("does not mutate its inputs", () => {
    const b = withBuiltFloor();
    const snapshot = JSON.stringify(b);
    fitOutRooms(b, 5, "standard", 2);
    expect(JSON.stringify(b)).toBe(snapshot);
  });
});

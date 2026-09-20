// Physical expansion of the building: the player pays for a whole new floor
// (a few days of structural works), then fits it out with rooms (Standard,
// Deluxe or Suite). More rooms means a higher capacity, so the demand model
// (lib/demand/demandEngine.js generates bookings per bookable room) can
// absorb more guests -- nothing here touches demand directly.
//
// State lives at `hotelState.buildingExpansion` = { floors: { [level]:
// { status: "building" | "built", startedOnDay, completesOnDay, builtOnDay } },
// completedLog: [{ level, day }] }. The fitted-out rooms live in the hotel's
// normal `rooms` list (so housekeeping, reservations, staffing and the PMS
// all see them like any other room), tagged with `metadata.expansionFloor`
// and `floor` = the floor's level.
//
// Floors are built one at a time, from `BASE_FLOORS + 1` upwards, up to
// MAX_NEW_FLOORS. Each costs a bit more than the last. A floor can hold
// SLOTS_PER_FLOOR rooms. While a floor is being built the noise costs a
// little guest satisfaction. Pure, deterministic (no rng), and inert for a
// hotel that never expanded. Paid through finance/investmentFunding.js
// (capital first, then treasury).
import { safeArray, safeNumber, safeObject } from "../safe";
import { canAfford, payInvestment } from "../finance/investmentFunding";
import { createRoom } from "../pmsModels";

// The schematic view already draws this many floors for the existing
// building (HotelSceneLayout.FLOOR_COUNT); the first new floor sits on top.
export const BASE_FLOORS = 4;
export const MAX_NEW_FLOORS = 4;
export const FLOOR_BASE_COST = 150000;
export const FLOOR_COST_STEP = 25000;
export const CONSTRUCTION_DAYS = 5;
export const SLOTS_PER_FLOOR = 6;
export const CONSTRUCTION_SATISFACTION_PENALTY = 2;

// What it costs to fit out one room of each kind, and what it starts at
// when the hotel has no room of that kind to copy a price from.
export const ROOM_KINDS = {
  standard: { label: "Standard", cost: 12000, defaultPrice: 120, capacity: 2 },
  deluxe: { label: "Deluxe", cost: 20000, defaultPrice: 180, capacity: 3 },
  suite: { label: "Suite", cost: 35000, defaultPrice: 320, capacity: 4 },
};

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).buildingExpansion);
  return { floors: safeObject(source.floors), completedLog: safeArray(source.completedLog) };
}

export function isExpansionRoom(room) {
  return Number.isFinite(Number(safeObject(safeObject(room).metadata).expansionFloor));
}

// The new floors, lowest first: [{ level, status, startedOnDay, completesOnDay, builtOnDay }].
export function expansionFloors(hotelState) {
  const { floors } = state(hotelState);
  return Object.keys(floors)
    .map((level) => ({ level: Number(level), ...floors[level] }))
    .sort((a, b) => a.level - b.level);
}

export function floorInfo(hotelState, level) {
  return expansionFloors(hotelState).find((floor) => floor.level === level) || null;
}

export function floorUnderConstruction(hotelState) {
  return expansionFloors(hotelState).find((floor) => floor.status === "building") || null;
}

export function builtFloors(hotelState) {
  return expansionFloors(hotelState).filter((floor) => floor.status === "built");
}

export function nextFloorLevel(hotelState) {
  return BASE_FLOORS + expansionFloors(hotelState).length + 1;
}

export function nextFloorCost(hotelState) {
  return FLOOR_BASE_COST + FLOOR_COST_STEP * expansionFloors(hotelState).length;
}

// Whether the next floor can be started: "available", "in-progress" (a
// floor is already being built), "max" (the building is at its limit) or
// "no-funds".
export function floorConstructionStatus(hotelState) {
  if (floorUnderConstruction(hotelState)) return "in-progress";
  if (expansionFloors(hotelState).length >= MAX_NEW_FLOORS) return "max";
  if (!canAfford(hotelState, nextFloorCost(hotelState))) return "no-funds";
  return "available";
}

export function roomsOnFloor(rooms, level) {
  return safeArray(rooms).filter((room) => isExpansionRoom(room) && Number(room.metadata.expansionFloor) === level);
}

export function freeSlots(rooms, level) {
  return Math.max(0, SLOTS_PER_FLOOR - roomsOnFloor(rooms, level).length);
}

// Every room added by expansion, hotel-wide: the capacity the player has built.
export function expansionRoomCount(rooms) {
  return safeArray(rooms).filter(isExpansionRoom).length;
}

// Why rooms of `kind` can or can't be fitted out on floor `level` right now:
// "available", "unknown-kind", "not-built", "floor-full" or "no-funds".
export function fitOutStatus(hotelBundle, level, kind, count = 1) {
  const bundle = safeObject(hotelBundle);
  const info = floorInfo(bundle.hotelState, level);
  const room = ROOM_KINDS[kind];
  if (!room) return "unknown-kind";
  if (!info || info.status !== "built") return "not-built";
  if (freeSlots(bundle.rooms, level) < count) return "floor-full";
  if (!canAfford(bundle.hotelState, room.cost * count)) return "no-funds";
  return "available";
}

// The going rate for a kind of room: the average of the hotel's existing
// rooms of that type (so new rooms are priced like the rest), else the default.
function priceFor(rooms, kind) {
  const prices = safeArray(rooms)
    .filter((room) => room.type === kind && safeNumber(room.price, 0) > 0)
    .map((room) => safeNumber(room.price, 0));
  if (prices.length === 0) return ROOM_KINDS[kind].defaultPrice;
  return Math.round(prices.reduce((total, price) => total + price, 0) / prices.length);
}

// ---- actions -------------------------------------------------------------

// Starts the structural works of the next floor: pays now, and the floor is
// built after CONSTRUCTION_DAYS days (see advanceExpansion()). A no-op
// (returns the bundle unchanged) unless the construction is "available".
export function startFloorConstruction(hotelBundle, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (floorConstructionStatus(hotelState) !== "available") return bundle;
  const level = nextFloorLevel(hotelState);
  const { hotelState: paidState } = payInvestment(hotelState, nextFloorCost(hotelState));
  const current = state(hotelState);

  return {
    ...bundle,
    hotelState: {
      ...paidState,
      buildingExpansion: {
        floors: { ...current.floors, [level]: { status: "building", startedOnDay: day, completesOnDay: day + CONSTRUCTION_DAYS } },
        completedLog: current.completedLog,
      },
    },
  };
}

// Fits out `count` rooms of `kind` on a built floor: pays now, and the rooms
// are added (free, clean, priced like the hotel's other rooms of that kind)
// to the hotel's room list, numbered <level><two digits> ("501", "502"...).
// A no-op unless fitOutStatus() is "available".
export function fitOutRooms(hotelBundle, level, kind, count = 1) {
  const bundle = safeObject(hotelBundle);
  if (!Number.isInteger(count) || count < 1) return bundle;
  if (fitOutStatus(bundle, level, kind, count) !== "available") return bundle;

  const rooms = safeArray(bundle.rooms);
  const spec = ROOM_KINDS[kind];
  const { hotelState } = payInvestment(bundle.hotelState, spec.cost * count);
  const price = priceFor(rooms, kind);
  const onFloor = roomsOnFloor(rooms, level);
  const takenNumbers = new Set(rooms.map((room) => String(room.number)));
  let nextId = rooms.reduce((max, room) => Math.max(max, safeNumber(room.id, 0)), 0) + 1;
  let position = onFloor.length;

  const added = Array.from({ length: count }, () => {
    let number;
    do {
      position += 1;
      number = `${level}${String(position).padStart(2, "0")}`;
    } while (takenNumbers.has(number));
    takenNumbers.add(number);
    const room = createRoom({
      id: nextId,
      number,
      type: kind,
      price,
      floor: level,
      capacity: spec.capacity,
      status: "libre",
      housekeeping_status: "clean",
      metadata: { expansionFloor: level },
    });
    nextId += 1;
    return room;
  });

  return { ...bundle, hotelState, rooms: [...rooms, ...added] };
}

// Finishes every floor whose works day has come. Called once per played day
// by careerEngine.runCareerDay(). A no-op for a hotel with nothing under
// construction.
export function advanceExpansion(hotelState, day) {
  const current = state(hotelState);
  const due = Object.keys(current.floors).filter((level) => current.floors[level].status === "building" && current.floors[level].completesOnDay <= day);
  if (due.length === 0) return hotelState;

  const floors = { ...current.floors };
  const completedLog = [...current.completedLog];
  due.forEach((level) => {
    floors[level] = { status: "built", startedOnDay: floors[level].startedOnDay, completesOnDay: floors[level].completesOnDay, builtOnDay: day };
    completedLog.push({ level: Number(level), day });
  });
  return { ...hotelState, buildingExpansion: { floors, completedLog } };
}

export function floorsCompletedOn(hotelState, day) {
  return state(hotelState).completedLog.filter((entry) => entry.day === day);
}

// Guest nuisance while a floor is being built (0 otherwise).
export function constructionSatisfactionPenalty(hotelState) {
  return floorUnderConstruction(hotelState) ? CONSTRUCTION_SATISFACTION_PENALTY : 0;
}

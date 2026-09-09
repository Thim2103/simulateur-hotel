// The ONLY place in this codebase allowed to know both the hotel's real
// business data (room.status, housekeeping_status, staffCount,
// diagnostics...) AND the generic scene-entity shape SceneState.js
// defines. Every other engine file (IsoProjection.js, DepthSort.js,
// SceneState.js) is domain-agnostic on purpose -- this is the single
// translation layer between "what the simulation knows" and "what the
// scene shows", so that translation only ever has to be written once and
// reviewed in one place. See SceneState.js's own docstring for the shape
// each produced entity follows.
//
// Pipeline this file sits in: business props -> EntityFactory (here) ->
// SceneState -> render. Positions come from HotelSceneLayout.js (a purely
// spatial, business-agnostic layout) -- this file decides *which* business
// object maps to *which* layout tile and *what generic state/activity* it
// gets, never the coordinates themselves.
import { tileToWorld } from "./IsoProjection";
import { safeArray, safeNumber, safeObject } from "../../../lib/safe";
import { FLOOR_COUNT, AMENITY_LAYOUT, roomTile, guestTile, staffTile, incidentTile } from "../scene/HotelSceneLayout";

const MAX_CHARACTERS = 6;

// Wall-clock-driven ambient day phase -- same idea every isometric view has
// had (see IsoFinalView.jsx's git history), now centralised here since
// "what activity should an ambient character be doing right now" is a
// business/gameplay-flavoured translation, not a rendering concern.
export function dayPhase(date = new Date()) {
  const hour = date.getHours();
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

const PHASE_GUEST_ACTIVITY = { morning: "checkin", noon: "eating", afternoon: "walking", evening: "idle", night: "sleeping" };
const PHASE_STAFF_ACTIVITY = { morning: "reception", noon: "cooking", afternoon: "laundry", evening: "bartending", night: "idle" };

// room.status/housekeeping_status/cleaningRoomIds -> a generic room state.
// This is the one line the whole "EntityFactory is the only place allowed
// to read business fields" rule exists to protect.
function roomState(room, cleaningRoomIds) {
  if (cleaningRoomIds?.has(room.id)) return "cleaning";
  if (room.status === "occupée") return "occupied";
  if (room.housekeeping_status === "dirty") return "dirty";
  return "clean";
}

function toWorldPosition(tile) {
  return tileToWorld(tile);
}

function zeroFootprint() {
  return { width: 0, depth: 0, height: 0 };
}

// Groups the hotel's rooms into floors, exactly as IsoFinalView.jsx used to
// do inline. Kept here (rather than in HotelSceneLayout.js, which must stay
// business-agnostic) because "how many rooms per floor" is derived from the
// hotel's own room count, a business fact.
function groupRoomsByFloor(rooms) {
  const roomsPerFloor = Math.max(1, Math.ceil(rooms.length / FLOOR_COUNT));
  const floors = Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => ({
    floorIndex,
    level: FLOOR_COUNT - floorIndex,
    rooms: rooms.slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor),
  })).filter((floor) => floor.rooms.length > 0);
  return { floors, roomsPerFloor };
}

function buildRoomEntities(rooms, cleaningRoomIds) {
  const { floors } = groupRoomsByFloor(rooms);
  return floors.flatMap((floor) =>
    floor.rooms.map((room, indexInFloor) => {
      const tile = roomTile({ floorIndex: floor.floorIndex, indexInFloor });
      return {
        // Stable across renders: derived from the room's own (already
        // stable) business id, never from its position in an array.
        id: `room:${room.id}`,
        type: "room",
        position: toWorldPosition(tile),
        footprint: zeroFootprint(),
        state: roomState(room, cleaningRoomIds),
        activity: null,
        metadata: { number: room.number, floorLevel: floor.level },
      };
    })
  );
}

function buildAmenityEntities(hasIncident) {
  return Object.entries(AMENITY_LAYOUT).map(([kind, tile]) => ({
    id: `amenity:${kind}`,
    type: kind,
    position: toWorldPosition(tile),
    footprint: zeroFootprint(),
    state: kind === "laundry" && hasIncident ? "alert" : "idle",
    activity: null,
    metadata: {},
  }));
}

function buildCharacterEntities({ occupiedCount, staffCount, roomsPerFloor, phase, decisionFeedback }) {
  const staffActivity = decisionFeedback?.target === "staff" ? "walking" : PHASE_STAFF_ACTIVITY[phase];
  const guestActivity = PHASE_GUEST_ACTIVITY[phase];

  const guests = Array.from({ length: Math.min(MAX_CHARACTERS, occupiedCount) }, (_, index) => {
    const tile = guestTile({ index, roomsPerFloor });
    return {
      // Stable for as long as this guest "slot" exists in the scene (see
      // this file's own docstring on ambient/aggregate characters): index-
      // based, not tied to any individual real guest's identity.
      id: `character:guest:${index}`,
      type: "character",
      position: toWorldPosition(tile),
      footprint: zeroFootprint(),
      state: "present",
      activity: guestActivity,
      metadata: { kind: "guest" },
    };
  });

  const staff = Array.from({ length: Math.min(MAX_CHARACTERS, staffCount) }, (_, index) => {
    const tile = staffTile({ index, roomsPerFloor });
    return {
      id: `character:staff:${index}`,
      type: "character",
      position: toWorldPosition(tile),
      footprint: zeroFootprint(),
      state: "present",
      activity: staffActivity,
      metadata: { kind: "staff" },
    };
  });

  return [...guests, ...staff];
}

function buildIncidentEntities(diagnostics) {
  const incidents = diagnostics.filter((d) => d.type === "error" || d.severity === "high").slice(0, 3);
  return incidents.map((incident, index) => {
    const tile = incidentTile({ index });
    return {
      // Stable id derived from the diagnostic's own id when it has one,
      // falling back to its position among this frame's incidents.
      id: `incident:${incident.id ?? index}`,
      type: "incident",
      position: toWorldPosition(tile),
      footprint: zeroFootprint(),
      state: "active",
      activity: null,
      metadata: { incidentType: "breakdown", message: incident.message },
    };
  });
}

// The main entry point: business props in, a flat array of generic scene
// entities out (positions already resolved via HotelSceneLayout.js, ready
// to be handed to SceneState.js's `createSceneState`). Every business field
// this function reads stops here -- nothing downstream (SceneState,
// DepthSort, IsoProjection, the render layer) ever sees `room.status`,
// `housekeeping_status`, `diagnostics[].severity`, etc. again.
export function buildHotelSceneEntities(props = {}) {
  const {
    rooms: rawRooms,
    staffCount: rawStaffCount,
    diagnostics: rawDiagnostics,
    decisionFeedback = null,
    cleaningRoomIds,
  } = safeObject(props);

  const rooms = safeArray(rawRooms);
  const staffCount = safeNumber(rawStaffCount, 0);
  const diagnostics = safeArray(rawDiagnostics);

  const occupiedCount = rooms.filter((room) => room.status === "occupée").length;
  const hasIncident = diagnostics.some((d) => d.type === "error" || d.severity === "high");
  const { roomsPerFloor } = groupRoomsByFloor(rooms);
  const phase = dayPhase();

  return [
    ...buildRoomEntities(rooms, cleaningRoomIds),
    ...buildAmenityEntities(hasIncident),
    ...buildCharacterEntities({ occupiedCount, staffCount, roomsPerFloor, phase, decisionFeedback }),
    ...buildIncidentEntities(diagnostics),
  ];
}

// Exposed for tests and for anything (e.g. IsoFinalView's own floor-label
// chrome) that still needs "how many floors, how many rooms on each" --
// decorative-only, never fed back into a scene entity.
export function computeFloors(rooms) {
  return groupRoomsByFloor(safeArray(rooms)).floors;
}

const EntityFactory = { buildHotelSceneEntities, computeFloors, dayPhase };
export default EntityFactory;

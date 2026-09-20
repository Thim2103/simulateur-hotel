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
import { isExpansionRoom } from "../../../lib/expansion/hotelExpansionEngine";
import { isMeetingRoom } from "../../../lib/mice/miceEngine";

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
// A room the hotel cannot sell or use (works, breakdown): a flag on the room's
// metadata, added only when true like `vip` and `meeting`.
function isOutOfService(room) {
  return room.status === "maintenance" || room.status === "hors_service";
}

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

function buildRoomEntities(rooms, cleaningRoomIds, vipRoomIds) {
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
        // `roomId` is the exact same raw business id already embedded in
        // this entity's own `id` string above -- exposed here too, plainly
        // typed, so a consumer (e.g. the schematic view's own housekeeping
        // quick-action modal, which needs to call back into
        // `cleaningRoomIds.has(room.id)`) never has to parse it back out
        // of `"room:<id>"` and risk a string/number mismatch.
        metadata: { number: room.number, floorLevel: floor.level, roomId: room.id, ...(vipRoomIds?.has(room.id) ? { vip: true } : {}), ...(isMeetingRoom(room) ? { meeting: true } : {}), ...(isOutOfService(room) ? { outOfService: true } : {}) },
      };
    })
  );
}

// Rooms added by the hotel's own expansion (lib/expansion/) sit on floors
// ABOVE the existing building, each with its real floor level -- so they are
// NOT spread over the fixed-height floors the base rooms are grouped into
// (groupRoomsByFloor() above). Only a caller that asks for them
// (`includeExpansion`, the schematic view) gets them, as ordinary room
// entities carrying their own `floorLevel`; the isometric scene, whose
// layout has a fixed number of floors, keeps showing the base building only.
function buildExpansionRoomEntities(rooms, cleaningRoomIds, vipRoomIds) {
  return rooms.map((room, indexInFloor) => ({
    id: `room:${room.id}`,
    type: "room",
    position: toWorldPosition(roomTile({ floorIndex: 0, indexInFloor })),
    footprint: zeroFootprint(),
    state: roomState(room, cleaningRoomIds),
    activity: null,
    metadata: { number: room.number, floorLevel: Number(room.metadata.expansionFloor), roomId: room.id, expansion: true, roomType: room.type, ...(vipRoomIds?.has(room.id) ? { vip: true } : {}), ...(isMeetingRoom(room) ? { meeting: true } : {}), ...(isOutOfService(room) ? { outOfService: true } : {}) },
  }));
}

// When the laundry amenity is in "alert" state, its own metadata carries
// the actual diagnostic behind that alert (message + severity) -- so a
// consumer (e.g. the schematic view's own incident quick-action modal)
// can show the real reason, not just a bare boolean. Picks the same
// diagnostic `hasIncident` itself is derived from (an error, or
// high-severity) -- never a second, independent read of `diagnostics`.
function relevantDiagnostic(diagnostics) {
  return diagnostics.find((d) => d.type === "error" || d.severity === "high") || null;
}

// The OLD, ephemeral path: a bare "is there currently a qualifying
// diagnostic" boolean, recomputed fresh every render from `diagnostics`
// (lib/analytics/analyticsDiagnostics.js) -- no persistence, no way to
// ever "resolve" it. Kept only as a fallback for a caller that hasn't
// been updated to pass real `activeIncidents` yet (see
// buildHotelSceneEntities() below) -- HotelScene.jsx/other experimental
// callers, for instance.
function buildAmenityEntitiesFromDiagnostics(diagnostics) {
  const hasIncident = diagnostics.some((d) => d.type === "error" || d.severity === "high");
  const diagnostic = hasIncident ? relevantDiagnostic(diagnostics) : null;
  return Object.entries(AMENITY_LAYOUT).map(([kind, tile]) => {
    const isAlert = kind === "laundry" && hasIncident;
    return {
      id: `amenity:${kind}`,
      type: kind,
      position: toWorldPosition(tile),
      footprint: zeroFootprint(),
      state: isAlert ? "alert" : "idle",
      activity: null,
      metadata: isAlert && diagnostic ? { message: diagnostic.message, severity: diagnostic.severity } : {},
    };
  });
}

// The REAL, persistent path: a zone's alert state comes from
// `hotelState.activeIncidents` (see lib/maintenance/incidentEngine.js) --
// a genuinely resolvable record, not a value recomputed from scratch
// every render. "alert" for a still-open incident, a distinct "repairing"
// state once the player has paid for a standard (non-emergency) repair
// and it's awaiting its ETA day, and back to "idle" the moment
// incidentEngine.advanceIncidentRepairs() marks it "resolved" -- which is
// what actually makes the schematic view's own alert badge disappear.
function buildAmenityEntitiesFromIncidents(activeIncidents) {
  return Object.entries(AMENITY_LAYOUT).map(([kind, tile]) => {
    const incident = activeIncidents.find((item) => item.zone === kind && item.status !== "resolved");
    return {
      id: `amenity:${kind}`,
      type: kind,
      position: toWorldPosition(tile),
      footprint: zeroFootprint(),
      state: incident ? (incident.status === "repairing" ? "repairing" : "alert") : "idle",
      activity: null,
      metadata: incident
        ? { message: incident.message, severity: incident.severity, incidentId: incident.id, repairCost: incident.repairCost, repairEtaDay: incident.repairEtaDay ?? null }
        : {},
    };
  });
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
    activeIncidents: rawActiveIncidents,
    decisionFeedback = null,
    cleaningRoomIds,
    includeExpansion = false,
    vipRoomIds,
  } = safeObject(props);

  const allRooms = safeArray(rawRooms);
  const rooms = allRooms.filter((room) => !isExpansionRoom(room));
  const expansionRooms = includeExpansion ? allRooms.filter(isExpansionRoom) : [];
  const staffCount = safeNumber(rawStaffCount, 0);
  const diagnostics = safeArray(rawDiagnostics);

  const occupiedCount = allRooms.filter((room) => room.status === "occupée").length;
  const { roomsPerFloor } = groupRoomsByFloor(rooms);
  const phase = dayPhase();

  // See buildAmenityEntitiesFromIncidents()'s own docstring: a caller
  // that supplies `activeIncidents` (even an empty array) gets the real,
  // persistent, resolvable alert state; a caller that never passes it at
  // all (`undefined`) keeps the old ephemeral diagnostics-derived one, so
  // this rolls out per-caller without a flag day regressing anything else
  // still on the old path.
  const amenityEntities = rawActiveIncidents !== undefined ? buildAmenityEntitiesFromIncidents(safeArray(rawActiveIncidents)) : buildAmenityEntitiesFromDiagnostics(diagnostics);

  return [
    ...buildRoomEntities(rooms, cleaningRoomIds, vipRoomIds),
    ...buildExpansionRoomEntities(expansionRooms, cleaningRoomIds, vipRoomIds),
    ...amenityEntities,
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

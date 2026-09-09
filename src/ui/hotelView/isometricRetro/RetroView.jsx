import { useEffect, useRef } from "react";
import RetroGrid, { toIsoRetro } from "./RetroGrid";
import RetroFloor from "./RetroFloor";
import RetroReception from "./RetroReception";
import RetroRestaurant from "./RetroRestaurant";
import RetroBackOffice from "./RetroBackOffice";
import RetroCharacter from "./RetroCharacter";
import RetroIncident from "./RetroIncident";
import { walkCycle, cleanCycle, eatCycle } from "./RetroAnimations";
import HotelTimeline from "../v2/HotelTimeline";
import { fadeIn } from "../../animations";

const FLOOR_COUNT = 4;
const GROUND_ROW = FLOOR_COUNT;
const MAX_CHARACTERS = 6;

// Same wall-clock-driven "which ambient activity feels right now" idea as
// v3's HotelViewIsometric.jsx's dayPhase() -- kept as its own copy here
// (isometricRetro/ is a self-contained art-direction module, see
// RetroGrid.jsx's own docstring) rather than imported, so this module
// never depends on v3.
function dayPhase(date = new Date()) {
  const hour = date.getHours();
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

const PHASE_GUEST_ACTIVITY = { morning: "checkin", noon: "eating", afternoon: "walking", evening: "idle", night: "sleeping" };
const PHASE_STAFF_ACTIVITY = { morning: "reception", noon: "serving", afternoon: "cleaning", evening: "maintenance", night: "idle" };

// RetroView -- the retro-modern isometric hotel view. Same read-only,
// real-data contract and exact same props as v3's HotelViewIsometric.jsx
// (drop-in, see pages/Dashboard.jsx's toggle), rendered in the new
// pastel/cartoon art direction (see RetroStyle.js/RetroSprites.js) instead.
export default function RetroView({
  day,
  rooms = [],
  staffCount = 0,
  todaysEvents = [],
  diagnostics = [],
  decisionFeedback = null,
  cleaningRoomIds,
  onNextDay,
  isRunning,
}) {
  // Decision feedback (see decisionFeedback.js, reused as-is from v2):
  // staff/housekeeping already have their own real visual reaction
  // (`staffActivity` below, `cleaningRoomIds`); every other target plays
  // a cartoon cycle on the whole stage.
  const stageRef = useRef(null);

  useEffect(() => {
    if (!decisionFeedback || !stageRef.current) return;
    if (decisionFeedback.target === "staff" || decisionFeedback.target === "housekeeping") return;
    if (decisionFeedback.animation === "bounce") eatCycle(stageRef.current);
    else if (decisionFeedback.animation === "shimmer") cleanCycle(stageRef.current);
    else walkCycle(stageRef.current);
  }, [decisionFeedback]);

  const phase = dayPhase();
  const occupiedCount = rooms.filter((room) => room.status === "occupée").length;
  const hasIncident = diagnostics.some((d) => d.type === "error" || d.severity === "high");

  const roomsPerFloor = Math.max(1, Math.ceil(rooms.length / FLOOR_COUNT));
  const floors = Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => ({
    level: FLOOR_COUNT - floorIndex,
    row: floorIndex,
    rooms: rooms
      .slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor)
      .map((room) => ({
        ...room,
        state: cleaningRoomIds?.has(room.id) ? "cleaning" : room.status === "occupée" ? "occupied" : room.housekeeping_status === "dirty" ? "dirty" : "clean",
      })),
  })).filter((floor) => floor.rooms.length > 0);

  const staffActivity = decisionFeedback?.target === "staff" ? "walking" : PHASE_STAFF_ACTIVITY[phase];
  const guestActivity = PHASE_GUEST_ACTIVITY[phase];

  const guests = Array.from({ length: Math.min(MAX_CHARACTERS, occupiedCount) }, (_, index) => ({
    id: `guest-${index}`,
    col: (index % roomsPerFloor) + 0.5,
    row: GROUND_ROW - 0.5,
  }));
  const staff = Array.from({ length: Math.min(MAX_CHARACTERS, staffCount) }, (_, index) => ({
    id: `staff-${index}`,
    col: (index % roomsPerFloor) + 1,
    row: GROUND_ROW - 1,
  }));

  const incidents = diagnostics.filter((d) => d.type === "error" || d.severity === "high").slice(0, 3);

  return (
    <div className={`flex flex-col gap-4 ${fadeIn}`}>
      <HotelTimeline day={day} eventCount={todaysEvents.length} onNextDay={onNextDay} isRunning={isRunning} />

      <div ref={stageRef} className="rounded-[1.5rem] border-2 border-[#f9a8d4]/40 bg-gradient-to-b from-white to-[#fdf4ff] p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-[#3f3a52]">🏨 Vue isométrique rétro de l'hôtel</h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
        ) : (
          <RetroGrid>
            {floors.map((floor) => (
              <RetroFloor key={floor.level} level={floor.level} row={floor.row} rooms={floor.rooms} />
            ))}

            <RetroReception col={0} row={GROUND_ROW} />
            <RetroRestaurant col={2} row={GROUND_ROW} />
            <RetroBackOffice col={4} row={GROUND_ROW} hasIncident={hasIncident} />

            {/* Decorative flourishes -- a couple of plants dotted around
                the ground floor, purely aria-hidden set dressing (per the
                spec's "ajouter des éléments décoratifs"). */}
            {[1, 3].map((col) => {
              const { x, y } = toIsoRetro(col, GROUND_ROW + 0.6);
              return (
                <span key={col} aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2 text-lg" style={{ left: x, top: y }}>
                  🪴
                </span>
              );
            })}

            {guests.map((character) => (
              <RetroCharacter key={character.id} kind="guest" col={character.col} row={character.row} activity={guestActivity} />
            ))}
            {staff.map((character) => (
              <RetroCharacter key={character.id} kind="staff" col={character.col} row={character.row} activity={staffActivity} />
            ))}

            {incidents.map((incident, index) => (
              <RetroIncident key={index} col={5 + index} row={GROUND_ROW} type="breakdown" message={incident.message} />
            ))}
          </RetroGrid>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import IsoFinalGrid from "./IsoFinalGrid";
import IsoFinalFloor from "./IsoFinalFloor";
import IsoFinalReception from "./IsoFinalReception";
import IsoFinalRestaurant from "./IsoFinalRestaurant";
import IsoFinalKitchen from "./IsoFinalKitchen";
import IsoFinalBar from "./IsoFinalBar";
import IsoFinalLaundry from "./IsoFinalLaundry";
import IsoFinalHall from "./IsoFinalHall";
import IsoFinalCharacter from "./IsoFinalCharacter";
import IsoFinalIncident from "./IsoFinalIncident";
import { walkCycle, cleanCycle, eatCycle } from "./IsoFinalAnimations";
import HotelTimeline from "../v2/HotelTimeline";
import { fadeIn } from "../../animations";

const FLOOR_COUNT = 4;
const GROUND_ROW = FLOOR_COUNT;
const MAX_CHARACTERS = 6;

// Same wall-clock-driven "which ambient activity feels right now" idea as
// every earlier isometric view's own dayPhase() -- kept as its own copy
// (isometricFinal/ is a self-contained art-direction module, see
// IsoFinalGrid.jsx's own docstring) rather than imported from v3/RetroView.
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
// Staff activity now spans the richer set of rooms the Bible asks for --
// cooking at noon (kitchen), bartending in the evening (bar), laundry in
// the afternoon (housekeeping), on top of the reception/cleaning/
// maintenance rotation earlier views already had.
const PHASE_STAFF_ACTIVITY = { morning: "reception", noon: "cooking", afternoon: "laundry", evening: "bartending", night: "idle" };

// IsoFinalView -- the "Retro-Moderne Premium" isometric hotel view (see
// the Bible Artistique). Same read-only, real-data contract and exact
// same props as v3's HotelViewIsometric.jsx / RetroView.jsx (drop-in, see
// pages/Dashboard.jsx's toggle), composing all 7 room types the Bible
// asks for: chambres, réception, restaurant, cuisine, bar, laundry, hall.
export default function IsoFinalView({
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

      <div ref={stageRef} className="rounded-[1.5rem] border-2 p-4 shadow-sm sm:p-5" style={{ borderColor: "#A7D3F233", background: "linear-gradient(180deg, #ffffff 0%, #F2A7B111 100%)" }}>
        <h2 className="mb-3 text-sm font-bold" style={{ color: "#1F2A44" }}>🏨 Vue isométrique premium de l'hôtel</h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
        ) : (
          <IsoFinalGrid>
            {floors.map((floor) => (
              <IsoFinalFloor key={floor.level} level={floor.level} row={floor.row} rooms={floor.rooms} />
            ))}

            <IsoFinalReception col={0} row={GROUND_ROW} />
            <IsoFinalRestaurant col={2} row={GROUND_ROW} />
            <IsoFinalKitchen col={4} row={GROUND_ROW} />
            <IsoFinalBar col={6} row={GROUND_ROW} />
            <IsoFinalLaundry col={8} row={GROUND_ROW} hasIncident={hasIncident} />
            <IsoFinalHall col={10} row={GROUND_ROW} />

            {guests.map((character) => (
              <IsoFinalCharacter key={character.id} kind="guest" col={character.col} row={character.row} activity={guestActivity} />
            ))}
            {staff.map((character) => (
              <IsoFinalCharacter key={character.id} kind="staff" col={character.col} row={character.row} activity={staffActivity} />
            ))}

            {incidents.map((incident, index) => (
              <IsoFinalIncident key={index} col={11 + index} row={GROUND_ROW} type="breakdown" message={incident.message} />
            ))}
          </IsoFinalGrid>
        )}
      </div>
    </div>
  );
}

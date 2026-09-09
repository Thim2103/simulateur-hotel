import { useEffect, useRef } from "react";
import IsoGrid, { toIso } from "./IsoGrid";
import IsoFloor from "./IsoFloor";
import IsoReception from "./IsoReception";
import IsoRestaurant from "./IsoRestaurant";
import IsoBackOffice from "./IsoBackOffice";
import IsoCharacter from "./IsoCharacter";
import IsoIncident from "./IsoIncident";
import { avoidCollisions } from "./IsoPathfinding";
import { isoPulse, isoBounce, isoFade } from "./IsoAnimations";
import HotelTimeline from "../v2/HotelTimeline";
import { fadeIn } from "../../animations";

const FLOOR_COUNT = 4;
const GROUND_ROW = FLOOR_COUNT;
const MAX_CHARACTERS = 6;

// Which ambient activity the ground floor (and its characters) leans into
// for the current real-world hour -- "synchronise les animations
// isométriques avec les phases du jour" per the spec. The simulation
// itself has no intraday clock (see ui/hotelView/v2/HotelTimeline.jsx's
// own docstring on why its 5 segments are a narrative device, not a real
// per-hour position), so this reads the *player's own* wall-clock time --
// a light touch of "this feels alive right now" rather than a claim about
// in-game time.
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
const PHASE_STAFF_ACTIVITY = { morning: "reception", noon: "serving", afternoon: "cleaning", evening: "maintenance", night: "idle" };

// HotelViewIsometric v3: the isometric ("3/4"), animated hotel view --
// same read-only, real-data contract as v2's HotelView2DAnimated.jsx
// (identical props, so pages/Dashboard.jsx can swap between the two, see
// its own "Vue isométrique / Vue 2D" toggle), rendered instead as a
// perspective grid (see IsoGrid.jsx's toIso()) with depth-sorted floors,
// ground-floor blocks, ambient characters and incidents.
export default function HotelViewIsometric({
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
  // (`staffActivity` below, `cleaningRoomIds`, respectively); every other
  // target flashes the whole stage -- one real DOM box, so the animation
  // actually paints, unlike animating a `display:contents` wrapper around
  // an individual isometric block would.
  const stageRef = useRef(null);

  useEffect(() => {
    if (!decisionFeedback || !stageRef.current) return;
    if (decisionFeedback.target === "staff" || decisionFeedback.target === "housekeeping") return;
    if (decisionFeedback.animation === "bounce") isoBounce(stageRef.current);
    else if (decisionFeedback.animation === "shimmer") isoFade(stageRef.current);
    else isoPulse(stageRef.current);
  }, [decisionFeedback]);

  const phase = dayPhase();
  const occupiedRooms = rooms.filter((room) => room.status === "occupée");
  const occupiedCount = occupiedRooms.length;
  const hasIncident = diagnostics.some((d) => d.type === "error" || d.severity === "high");

  const roomsPerFloor = Math.max(1, Math.ceil(rooms.length / FLOOR_COUNT));
  const floors = Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => ({
    level: FLOOR_COUNT - floorIndex,
    row: floorIndex,
    rooms: rooms
      .slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor)
      .map((room) => ({ ...room, state: cleaningRoomIds?.has(room.id) ? "cleaning" : room.status === "occupée" ? "occupied" : room.housekeeping_status === "dirty" ? "dirty" : "clean" })),
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
  const characters = avoidCollisions([...guests, ...staff]);

  const incidents = diagnostics.filter((d) => d.type === "error" || d.severity === "high").slice(0, 3);

  return (
    <div className={`flex flex-col gap-4 ${fadeIn}`}>
      <HotelTimeline day={day} eventCount={todaysEvents.length} onNextDay={onNextDay} isRunning={isRunning} />

      <div ref={stageRef} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Vue isométrique de l'hôtel</h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
        ) : (
          <IsoGrid>
            {floors.map((floor) => (
              <IsoFloor key={floor.level} level={floor.level} row={floor.row} rooms={floor.rooms} />
            ))}

            <IsoReception col={0} row={GROUND_ROW} />
            <IsoRestaurant col={2} row={GROUND_ROW} />
            <IsoBackOffice col={4} row={GROUND_ROW} hasIncident={hasIncident} />

            {characters
              .filter((c) => c.id.startsWith("guest"))
              .map((character) => (
                <IsoCharacter key={character.id} kind="guest" col={character.col} row={character.row} activity={guestActivity} />
              ))}
            {characters
              .filter((c) => c.id.startsWith("staff"))
              .map((character) => (
                <IsoCharacter key={character.id} kind="staff" col={character.col} row={character.row} activity={staffActivity} />
              ))}

            {incidents.map((incident, index) => (
              <IsoIncident key={index} col={5 + index} row={GROUND_ROW} type="breakdown" message={incident.message} />
            ))}
          </IsoGrid>
        )}
      </div>
    </div>
  );
}

// Exported purely so tests/other modules can reuse the projection without
// re-deriving it -- HotelViewIsometric.jsx itself only ever uses it inside
// the child components above.
export { toIso };

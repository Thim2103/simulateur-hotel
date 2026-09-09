import { useEffect, useRef } from "react";
import Reception from "../Reception";
import Restaurant from "../Restaurant";
import BackOffice from "../BackOffice";
import HotelRoomsLayer from "./HotelRoomsLayer";
import HotelCharactersLayer from "./HotelCharactersLayer";
import HotelEventsLayer from "./HotelEventsLayer";
import HotelIncidentsLayer from "./HotelIncidentsLayer";
import HotelTimeline from "./HotelTimeline";
import { playAnimation } from "./HotelAnimations";
import { fadeIn } from "../../animations";

// HotelView2D v2 -- the animated, "alive" hotel view. Composes the 4
// visual layers (rooms -> characters -> events, plus a separate incidents
// list) under a shared HotelTimeline, and reuses v1's Reception/
// Restaurant/BackOffice ground-floor blocks (see ../Reception.jsx etc.) as
// the anchor points decision feedback animates.
//
// Data sources (see each prop's own comment below) are the real engine
// outputs already wired through pages/Dashboard.jsx -- dashboardEngine.js
// for KPIs, replayEngine.js's eventsForCycle() for today's events,
// analyticsEngine.js's diagnostics for incidents, careerState.hotel.rooms
// for room state. Nothing here re-simulates or persists anything; it's a
// read-only, animated lens over state the business engines already
// computed (same contract as v1's HotelView2D).
export default function HotelView2DAnimated({
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
  const receptionRef = useRef(null);
  const restaurantRef = useRef(null);
  const backOfficeRef = useRef(null);
  const roomsRef = useRef(null);

  // Decision feedback (see decisionFeedback.js): replays the matching
  // animation on the matching ground-floor anchor every time the player
  // applies a new decision (`nonce` changes even for the same actionId).
  useEffect(() => {
    if (!decisionFeedback) return;
    const targetRef = { reception: receptionRef, restaurant: restaurantRef, housekeeping: backOfficeRef, rooms: roomsRef }[decisionFeedback.target];
    if (targetRef?.current) playAnimation(targetRef.current, decisionFeedback.animation);
  }, [decisionFeedback]);

  const occupiedCount = rooms.filter((room) => room.status === "occupée").length;
  const staffActivity = decisionFeedback?.target === "staff" ? "walking" : "idle";

  return (
    <div className={`flex flex-col gap-4 ${fadeIn}`}>
      <HotelTimeline day={day} eventCount={todaysEvents.length} onNextDay={onNextDay} isRunning={isRunning} />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Vue de l'hôtel</h2>

        <div ref={roomsRef} className="relative">
          <HotelRoomsLayer rooms={rooms} cleaningRoomIds={cleaningRoomIds} />
          <HotelCharactersLayer guestCount={occupiedCount} staffCount={staffCount} staffActivity={staffActivity} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
          <div ref={receptionRef}><Reception guestCount={occupiedCount} /></div>
          <div ref={restaurantRef}><Restaurant /></div>
          <div ref={backOfficeRef}><BackOffice hasIncident={diagnostics.some((d) => d.type === "error" || d.severity === "high")} /></div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Flux &amp; événements</p>
          <HotelEventsLayer todaysEvents={todaysEvents} decisionFeedback={decisionFeedback} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Incidents</p>
        <HotelIncidentsLayer diagnostics={diagnostics} />
      </div>
    </div>
  );
}

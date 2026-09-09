import { guestSprite, staffSprite } from "./HotelSprites";

const MAX_VISIBLE = 6;

// The characters layer: ambient guest/staff sprites walking their lane
// (see hotelView2d.css's `hv-walk-lane` keyframe), each with its own
// animation-delay/duration so they don't all move in lockstep. There is
// no per-guest/per-staff-member entity in the data model (careerState
// only carries aggregate counts -- occupied rooms, staff headcount, see
// dashboardEngine.js's computeKpis()), so this deliberately renders
// *ambient* characters seeded from those counts (capped at `MAX_VISIBLE`
// each) rather than tracking specific booked guests. `staffActivity`
// ("walking" by default, or whatever a decision's feedback asks for, see
// decisionFeedback.js) is applied to every staff sprite for a moment.
export default function HotelCharactersLayer({ guestCount = 0, staffCount = 0, staffActivity = "idle" }) {
  const guests = Array.from({ length: Math.min(MAX_VISIBLE, guestCount) });
  const staff = Array.from({ length: Math.min(MAX_VISIBLE, staffCount) });

  return (
    <div aria-hidden="true" className="pointer-events-none relative h-10 w-full overflow-hidden">
      {guests.map((_, index) => (
        <span
          key={`guest-${index}`}
          className="hv-character text-base"
          style={{ animationDuration: `${9 + index * 1.7}s`, animationDelay: `${index * 0.6}s`, top: "20%" }}
        >
          {guestSprite(index % 3 === 0 ? "walking" : "idle")}
        </span>
      ))}
      {staff.map((_, index) => (
        <span
          key={`staff-${index}`}
          className="hv-character text-base"
          style={{ animationDuration: `${7 + index * 1.4}s`, animationDelay: `${index * 0.4}s`, top: "70%" }}
        >
          {staffSprite(staffActivity)}
        </span>
      ))}
    </div>
  );
}

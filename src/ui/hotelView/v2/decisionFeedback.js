// Maps a DecisionsPanel action (see lib/dashboard/dashboardActions.js's
// QUICK_ACTION_CATALOG -- `{id, category}`) to the visual feedback the
// spec asks for: pricing -> pulse the rooms, staff -> the staff sprites
// walk, marketing -> shimmer the reception, restaurant -> bounce the
// restaurant block. "schedule-maintenance" (the one "operations" action
// in the real catalog) also flags a housekeeping "cleaning" flash, since
// there's no dedicated housekeeping quick action to trigger it from
// otherwise -- see HotelRoomsLayer.jsx's `cleaningRoomIds`.
export function feedbackForAction(actionId, category) {
  switch (category) {
    case "pricing":
      return { target: "rooms", animation: "pulse" };
    case "staff":
      return { target: "staff", animation: "walking" };
    case "marketing":
      return { target: "reception", animation: "shimmer" };
    case "operations":
      return actionId === "schedule-maintenance"
        ? { target: "housekeeping", animation: "cleaning" }
        : { target: "restaurant", animation: "bounce" };
    default:
      return { target: "rooms", animation: "pulse" };
  }
}

export default feedbackForAction;

// Clients behavioral indicators -- derives average spend, return rate
// and preferred segment from the hotel bundle (reservations + finance
// revenue) and the satisfaction score. Same pure-function contract as
// every other *Calculations.js in this app: no side effects, no I/O.
import { safeArray, safeNumber, safeObject } from "../safe";

// Estimates average revenue per guest-stay from Finance's own revenue
// figures and the room occupancy count.
function estimateAvgSpend({ dailyRevenue, occupiedRooms, fbRevenue = 0 }) {
  const revenue = safeNumber(dailyRevenue, 0) + safeNumber(fbRevenue, 0);
  const rooms = safeNumber(occupiedRooms, 0);
  if (rooms === 0) return null;
  return Math.round(revenue / rooms);
}

// Return rate: estimated from loyalty score (higher loyalty → more
// repeat guests) and satisfaction score. Returns a 0-100 percentage.
function estimateReturnRate({ loyalty, satisfaction }) {
  const l = safeNumber(loyalty, 50);
  const s = safeNumber(satisfaction, 65);
  // Weight: loyalty is the stronger predictor (70%), satisfaction 30%
  const raw = l * 0.7 + s * 0.3;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function computeBehaviors({
  hotelBundle = null,
  satisfaction = null,
  loyalty = null,
  segments = null,
  dailyRevenue = null,
  fbRevenue = null,
} = {}) {
  const bundle = safeObject(hotelBundle);
  const reservations = safeArray(bundle.reservations);

  const occupiedRooms = reservations.filter((r) => {
    const status = String(r.status || "").toLowerCase();
    return status === "occupied" || status === "checked-in";
  }).length;

  const avgSpend = estimateAvgSpend({ dailyRevenue, occupiedRooms, fbRevenue });
  const returnRate = estimateReturnRate({ loyalty, satisfaction });

  // Preferred segment: dominant one by share
  const seg = safeObject(segments);
  const entries = Object.entries(seg);
  const preferred =
    entries.length > 0
      ? entries.reduce((best, cur) => (safeNumber(cur[1], 0) > safeNumber(best[1], 0) ? cur : best), entries[0])[0]
      : null;

  return { avgSpend, returnRate, preferredSegment: preferred };
}

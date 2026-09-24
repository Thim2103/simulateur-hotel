// Guest profiles: every stay belongs to one of four kinds of guest, worked
// out from the reservation itself (its segment, its length, the room) plus a
// stable hash of its id -- so the same reservation is always the same kind of
// guest, with no rng and nothing to store.
//
//   family     -- leisure travellers, families and couples
//   business   -- business travellers
//   long-stay  -- four nights or more
//   vip        -- an influencer or V.I.P.: rarer (more often in a suite), and
//                 what they write carries three times the weight of anyone
//                 else's on the hotel's reputation and on the next day's
//                 demand (see guestReviewEngine.js)
//
// A V.I.P. present in the hotel is flagged to the player (schematic view,
// reception), so they can make sure the stay goes well.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { pseudoRandom } from "../staff/staffEventsEngine";

const DAY_MS = 86400000;

// pseudoRandom() (FNV-1a) gives close values for consecutive ids (guest 41, 42,
// 43 would all look alike), so its result gets a final avalanche mix: the same
// seed still always gives the same number, but neighbours no longer correlate.
export function mixedRandom(seed) {
  let h = Math.floor(pseudoRandom(seed) * 4294967296) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const VIP_WEIGHT = 3;
export const LONG_STAY_NIGHTS = 4;
// Chance that a stay goes badly wrong whatever the hotel does (shared by the
// reviews and the V.I.P. satisfaction, which are the same stay).
export const UNLUCKY_STAY_CHANCE = 0.08;
// Chance that a stay is a V.I.P.'s, by room type.
export const VIP_CHANCE = { suite: 0.2, deluxe: 0.08, default: 0.04 };

export const PROFILES = {
  family: { id: "family", label: "Familial", icon: "👨‍👩‍👧", weight: 1, description: "Voyageurs loisirs, familles et couples." },
  business: { id: "business", label: "Business", icon: "💼", weight: 1, description: "Voyageurs d'affaires, attentifs à l'efficacité." },
  "long-stay": { id: "long-stay", label: "Long séjour", icon: "🧳", weight: 1, description: "Séjour de quatre nuits ou plus." },
  vip: { id: "vip", label: "Influenceur / V.I.P.", icon: "⭐", weight: VIP_WEIGHT, description: "Son avis pèse trois fois plus sur votre réputation et sur la demande du lendemain." },
};

function dayIndex(value) {
  // A Date (or an ISO string, with or without a time) counts as its UTC day.
  const text = value?.toISOString ? value.toISOString() : String(value);
  return Math.floor(new Date(text.slice(0, 10)).getTime() / DAY_MS);
}

export function stayNights(reservation) {
  const nights = dayIndex(safeObject(reservation).departure) - dayIndex(safeObject(reservation).arrival);
  return Number.isFinite(nights) ? Math.max(1, nights) : 1;
}

export function profileIdFor(reservation, room) {
  const stay = safeObject(reservation);
  const chance = VIP_CHANCE[safeObject(room).type] ?? VIP_CHANCE.default;
  if (mixedRandom(`vip:${stay.id}`) < chance) return "vip";
  if (stayNights(stay) >= LONG_STAY_NIGHTS) return "long-stay";
  if (stay.segment === "business") return "business";
  return "family";
}

export function profileFor(reservation, room) {
  return PROFILES[profileIdFor(reservation, room)];
}

export function weightOf(profileId) {
  return PROFILES[profileId]?.weight ?? 1;
}

export function isVip(reservation, room) {
  return profileIdFor(reservation, room) === "vip";
}

// How many people follow a V.I.P. -- 20 000 to 500 000, stable per stay.
export function followersOf(reservation) {
  return 20000 + Math.floor(mixedRandom(`followers:${safeObject(reservation).id}`) * 480000);
}

function isCancelled(reservation) {
  return String(reservation.status || "").toLowerCase().includes("annul");
}

// The V.I.P.s staying in the hotel on the night of `date` (arrived, not yet
// departed): [{ reservationId, guestName, roomId, roomNumber, followers,
// departure }].
export function vipGuestsInHouse({ reservations, rooms, date } = {}) {
  const night = dayIndex(date ?? new Date());
  const roomsById = new Map(safeArray(rooms).map((room) => [Number(room.id), room]));
  return safeArray(reservations)
    // The meeting room of a seminar (lib/mice/) is not a guest.
    .filter((reservation) => !isCancelled(reservation) && reservation.source !== "mice-meeting" && dayIndex(reservation.arrival) <= night && night < dayIndex(reservation.departure))
    .map((reservation) => ({ reservation, room: roomsById.get(Number(reservation.room_id)) }))
    .filter(({ reservation, room }) => isVip(reservation, room))
    .map(({ reservation, room }) => ({
      reservationId: reservation.id,
      guestName: safeObject(reservation).client_name || `Client ${reservation.id}`,
      roomId: safeNumber(reservation.room_id, null),
      roomNumber: room?.number ?? reservation.room ?? "",
      followers: followersOf(reservation),
      departure: String(reservation.departure).slice(0, 10),
    }));
}

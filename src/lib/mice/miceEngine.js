// MICE -- Meetings, Incentives, Conferences, Exhibitions: companies ask the
// hotel for a quote to hold a seminar. A group wants:
//
//   a meeting room  -- a seminar or conference room big enough for everyone
//   catering        -- coffee breaks and lunch for each attendee, each day
//   bedrooms        -- for the 20 % of attendees who sleep over (multi-day
//                      events only: n days = n-1 nights), standard or deluxe
//
// Requests arrive deterministically from the calendar (no rng: a stable hash
// of the date), 20 to 100 attendees for 1 to 3 days, starting one to three
// weeks ahead, sized to the biggest meeting room the hotel has (a little
// beyond it, to tempt the player to build a bigger one). A quote is valid a
// week.
//
// The player can ACCEPT at the standard group rate (-10 %), NEGOTIATE a group
// discount of his own (0 to 30 %) or DECLINE. Each client expects a discount
// of its own (6 to 20 %, unknown to the player); the chance it signs rises
// with the discount offered (see conversionChance()) and is decided by a
// stable hash -- a well-calibrated offer converts, an insulting one doesn't,
// and a lost client is gone.
//
// A signed event is GUARANTEED: its rooms are booked at once as ordinary PMS
// reservations (the meeting room, each bedroom -- so the hotel fills up
// immediately and demand can't sell them again) and they earn revenue day by
// day like any stay. The catering is booked as restaurant revenue on each
// event day (a peak for the restaurant), less its food cost. Meeting rooms are
// not bedrooms: the general demand model no longer sells them as ordinary
// rooms.
//
// State: `hotelState.mice` = { requests, events, nextId, lastOutcome }. Pure
// and deterministic; a hotel with no meeting room, or that never got a
// request, keeps no MICE state.
import { safeArray, safeNumber, safeObject } from "../safe";
import { createReservation, findReservationConflicts } from "../pmsModels";
import { dayIndexOf, toIsoDate } from "../hotelEvents/hotelEventsEngine";
import { mixedRandom } from "../clients/guestProfiles";

const DAY_MS = 86400000;

export const MEETING_TYPES = ["seminar", "conference"];
export const OVERNIGHT_SHARE = 0.2;
export const DELUXE_SHARE = 0.3;
export const CATERING_PER_PERSON_DAY = 45; // coffee breaks + lunch
export const CATERING_COST_RATE = 0.35; // food cost, share of the catering revenue
export const STANDARD_DISCOUNT = 0.1;
export const MAX_DISCOUNT = 0.3;
export const REQUEST_CHANCE = 0.18; // per day
export const REQUEST_VALIDITY_DAYS = 7;
export const MIN_LEAD_DAYS = 7;
export const LEAD_SPAN = 15; // 7..21 days ahead
export const MIN_ATTENDEES = 20;
export const MAX_ATTENDEES = 100;
export const EXPECTED_DISCOUNT_MIN = 0.06;
export const EXPECTED_DISCOUNT_SPAN = 0.14; // 6..20 %
export const KEPT_CLOSED_REQUESTS = 20;
export const KEPT_DONE_EVENTS = 12;

const COMPANIES = [
  "Groupe Delcourt",
  "Novatek Solutions",
  "Cabinet Berthier & Associés",
  "Pharma Sud",
  "Altis Conseil",
  "Banque Régionale Rhône",
  "Solaris Énergie",
  "MédiaLoop",
  "Transports Vidal",
  "Institut Horizon",
  "Maison Verdier",
  "Cap Numérique",
];

function isoPlus(date, days) {
  return toIsoDate(new Date(dayIndexOf(date) * DAY_MS + days * DAY_MS));
}

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).mice);
  return { requests: safeArray(source.requests), events: safeArray(source.events), nextId: safeNumber(source.nextId, 1), lastOutcome: source.lastOutcome || null };
}

function withState(hotelState, next) {
  return { ...safeObject(hotelState), mice: { ...next } };
}

// ---- rooms ---------------------------------------------------------------------

export function isMeetingRoom(room) {
  return MEETING_TYPES.includes(safeObject(room).type);
}

function isBookable(room) {
  return room.status !== "maintenance" && room.status !== "hors_service";
}

export function meetingRooms(rooms) {
  return safeArray(rooms).filter((room) => isMeetingRoom(room) && isBookable(room));
}

export function maxMeetingCapacity(rooms) {
  return meetingRooms(rooms).reduce((max, room) => Math.max(max, safeNumber(room.capacity, 0)), 0);
}

function isCancelled(reservation) {
  return String(reservation.status || "").toLowerCase().includes("annul");
}

// Is a room free for every night of [from, from + nights)?
function isFree(reservations, room, from, nights) {
  const candidate = { id: -1, room_id: room.id, arrival: from, departure: isoPlus(from, nights) };
  return findReservationConflicts(safeArray(reservations), candidate).length === 0;
}

// ---- requests ----------------------------------------------------------------------

export function nightsOf(days) {
  return Math.max(0, days - 1);
}

export function bedroomsNeeded(attendees, days) {
  return nightsOf(days) === 0 ? 0 : Math.ceil(attendees * OVERNIGHT_SHARE);
}

// The request the calendar brings on `date`, or null. Sized to the hotel's
// biggest meeting room (up to 50 % beyond it).
export function generateRequest({ hotelState, rooms, date }) {
  const current = state(hotelState);
  const index = dayIndexOf(date);
  const cap = maxMeetingCapacity(rooms);
  if (cap === 0 || mixedRandom(`mice:${index}`) >= REQUEST_CHANCE) return null;
  if (current.requests.some((request) => request.receivedOn === toIsoDate(date))) return null;

  const biggest = Math.min(MAX_ATTENDEES, Math.max(MIN_ATTENDEES, Math.round((cap * 1.5) / 10) * 10));
  const sizes = [];
  for (let size = MIN_ATTENDEES; size <= biggest; size += 10) sizes.push(size);
  const days = 1 + Math.floor(mixedRandom(`mice-days:${index}`) * 3);
  const lead = MIN_LEAD_DAYS + Math.floor(mixedRandom(`mice-lead:${index}`) * LEAD_SPAN);

  return {
    id: current.nextId,
    company: COMPANIES[Math.floor(mixedRandom(`mice-company:${index}`) * COMPANIES.length) % COMPANIES.length],
    attendees: sizes[Math.floor(mixedRandom(`mice-size:${index}`) * sizes.length) % sizes.length],
    days,
    startDate: isoPlus(date, lead),
    receivedOn: toIsoDate(date),
    expiresOn: isoPlus(date, REQUEST_VALIDITY_DAYS),
    expectedDiscount: Math.round((EXPECTED_DISCOUNT_MIN + mixedRandom(`mice-expect:${index}`) * EXPECTED_DISCOUNT_SPAN) * 100) / 100,
    status: "pending",
  };
}

// The pending quotes the player can still answer on `date`.
export function pendingRequests(hotelState, date) {
  const today = toIsoDate(date ?? new Date());
  return state(hotelState).requests.filter((request) => request.status === "pending" && request.expiresOn >= today && request.startDate > today);
}

export function findRequest(hotelState, requestId) {
  return state(hotelState).requests.find((request) => request.id === requestId) || null;
}

// ---- prices --------------------------------------------------------------------------

// How much the group would cost at list price, and after `discount`:
// { meeting, catering, accommodation, rack, discount, total, lines }.
export function computeQuote({ request, rooms, meetingRoom, bedrooms, discount = 0 }) {
  const room = meetingRoom || meetingRooms(rooms).find((item) => safeNumber(item.capacity, 0) >= request.attendees) || meetingRooms(rooms)[0];
  const meeting = safeNumber(room?.price, 0) * request.days;
  const catering = request.attendees * CATERING_PER_PERSON_DAY * request.days;
  const bedList = safeArray(bedrooms);
  const sleepers = bedroomsNeeded(request.attendees, request.days);
  const average = (() => {
    const beds = safeArray(rooms).filter((item) => (item.type === "standard" || item.type === "deluxe") && isBookable(item));
    return beds.length ? beds.reduce((sum, item) => sum + safeNumber(item.price, 0), 0) / beds.length : 0;
  })();
  const perNight = bedList.length ? bedList.reduce((sum, item) => sum + safeNumber(item.price, 0), 0) : sleepers * average;
  const accommodation = perNight * nightsOf(request.days);
  const rack = Math.round(meeting + catering + accommodation);
  const applied = Math.max(0, Math.min(MAX_DISCOUNT, safeNumber(discount, 0)));
  const scale = (value) => Math.round(value * (1 - applied));
  return {
    meeting: scale(meeting),
    catering: scale(catering),
    accommodation: scale(accommodation),
    rack,
    discount: applied,
    total: scale(meeting) + scale(catering) + scale(accommodation),
    lines: { meetingRoom: room?.number ?? null, days: request.days, attendees: request.attendees, bedrooms: sleepers, nights: nightsOf(request.days) },
  };
}

// The chance the client signs at `discount`: 70 % at the discount it expects,
// rising by 2.5 points per point above it (up to 95 %), falling by 5 points
// per point below it (down to 5 %).
export function conversionChance(request, discount) {
  const gap = safeNumber(discount, 0) - safeNumber(request.expectedDiscount, 0.12);
  const chance = gap >= 0 ? 0.7 + gap * 2.5 : 0.7 + gap * 5;
  return Math.min(0.95, Math.max(0.05, chance));
}

// ---- can the hotel host it? ------------------------------------------------------------

// { ok, reason, meetingRoom, bedrooms } -- the smallest free meeting room big
// enough, and the free standard/deluxe rooms for the sleepers (about 30 %
// deluxe when there are enough).
export function requestFeasibility({ request, rooms, reservations }) {
  const meetingCandidates = meetingRooms(rooms).sort((a, b) => safeNumber(a.capacity, 0) - safeNumber(b.capacity, 0) || String(a.number).localeCompare(String(b.number)));
  if (meetingCandidates.length === 0) return { ok: false, reason: "Aucune salle de réunion", meetingRoom: null, bedrooms: [] };
  const big = meetingCandidates.filter((room) => safeNumber(room.capacity, 0) >= request.attendees);
  if (big.length === 0) return { ok: false, reason: `Aucune salle assez grande (capacité maximale : ${maxMeetingCapacity(rooms)} personnes)`, meetingRoom: null, bedrooms: [] };
  const meetingRoom = big.find((room) => isFree(reservations, room, request.startDate, request.days));
  if (!meetingRoom) return { ok: false, reason: "Salle de réunion déjà prise à ces dates", meetingRoom: null, bedrooms: [] };

  const needed = bedroomsNeeded(request.attendees, request.days);
  if (needed === 0) return { ok: true, reason: "", meetingRoom, bedrooms: [] };
  const nights = nightsOf(request.days);
  const free = safeArray(rooms).filter((room) => (room.type === "standard" || room.type === "deluxe") && isBookable(room) && isFree(reservations, room, request.startDate, nights));
  const byNumber = (a, b) => String(a.number).localeCompare(String(b.number));
  const standard = free.filter((room) => room.type === "standard").sort(byNumber);
  const deluxe = free.filter((room) => room.type === "deluxe").sort(byNumber);
  const wantDeluxe = Math.min(Math.round(needed * DELUXE_SHARE), deluxe.length);
  const picked = [...deluxe.slice(0, wantDeluxe), ...standard.slice(0, needed - wantDeluxe)];
  const remaining = [...deluxe.slice(wantDeluxe), ...standard.slice(needed - wantDeluxe)];
  const bedrooms = [...picked, ...remaining].slice(0, needed);
  if (bedrooms.length < needed) return { ok: false, reason: `Seulement ${free.length} chambre(s) libre(s) pour les ${needed} nécessaires`, meetingRoom, bedrooms: [] };
  return { ok: true, reason: "", meetingRoom, bedrooms };
}

// ---- answering a quote ----------------------------------------------------------------------

function nextReservationId(reservations) {
  return safeArray(reservations).reduce((max, reservation) => Math.max(max, safeNumber(reservation.id, 0)), 0) + 1;
}

// Answers a quote. `action` = { type: "accept" } (standard group rate),
// { type: "negotiate", discount } (0 to 0.30) or { type: "decline" }.
// Accepting or negotiating is a no-op unless the hotel can host the group
// (see requestFeasibility()); it then either signs (rooms booked at once,
// the event guaranteed) or the client walks away. A no-op for a quote that is
// not pending. `lastOutcome` says what happened, for the player.
export function respondToRequest(hotelBundle, requestId, action, { day = 0, date = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const current = state(hotelState);
  const request = current.requests.find((item) => item.id === requestId);
  const wanted = safeObject(action);
  if (!request || request.status !== "pending" || !pendingRequests(hotelState, date).some((item) => item.id === requestId)) return bundle;

  const close = (status, extra = {}) => current.requests.map((item) => (item.id === requestId ? { ...item, status, closedOn: toIsoDate(date), ...extra } : item));

  if (wanted.type === "decline") {
    return { ...bundle, hotelState: withState(hotelState, { ...current, requests: close("declined"), lastOutcome: { requestId, outcome: "declined", day } }) };
  }
  if (wanted.type !== "accept" && wanted.type !== "negotiate") return bundle;

  const feasibility = requestFeasibility({ request, rooms: bundle.rooms, reservations: bundle.reservations });
  if (!feasibility.ok) return bundle;

  const discount = wanted.type === "accept" ? STANDARD_DISCOUNT : Math.max(0, Math.min(MAX_DISCOUNT, safeNumber(wanted.discount, 0)));
  const chance = conversionChance(request, discount);
  const signs = mixedRandom(`mice-decision:${request.id}:${Math.round(discount * 100)}`) < chance;

  if (!signs) {
    return { ...bundle, hotelState: withState(hotelState, { ...current, requests: close("lost", { discount }), lastOutcome: { requestId, outcome: "lost", discount, day } }) };
  }

  // Signed: the rooms are booked at once.
  const quote = computeQuote({ request, rooms: bundle.rooms, meetingRoom: feasibility.meetingRoom, bedrooms: feasibility.bedrooms, discount });
  const nights = nightsOf(request.days);
  let id = nextReservationId(bundle.reservations);
  const reservations = [];
  const book = (room, departureDays, source) => {
    reservations.push(
      createReservation({
        id,
        room_id: room.id,
        room: room.number,
        room_type: room.type,
        client_name: `${request.company} (séminaire)`,
        arrival: request.startDate,
        departure: isoPlus(request.startDate, departureDays),
        status: "confirmée",
        price: Math.round(safeNumber(room.price, 0) * (1 - discount)),
        source,
        segment: "business",
        notes: `Séminaire ${request.company} — ${request.attendees} personnes`,
      })
    );
    id += 1;
  };
  book(feasibility.meetingRoom, request.days, "mice-meeting");
  feasibility.bedrooms.forEach((room) => book(room, nights, "mice"));

  const event = {
    id: request.id,
    requestId: request.id,
    company: request.company,
    attendees: request.attendees,
    days: request.days,
    startDate: request.startDate,
    endDate: isoPlus(request.startDate, request.days - 1),
    status: "confirmed",
    discount,
    quote,
    meetingRoomId: feasibility.meetingRoom.id,
    meetingRoomNumber: feasibility.meetingRoom.number,
    bedroomIds: feasibility.bedrooms.map((room) => room.id),
    cateringPerDay: Math.round(quote.catering / request.days),
    signedOn: toIsoDate(date),
  };

  return {
    ...bundle,
    reservations: [...safeArray(bundle.reservations), ...reservations],
    hotelState: withState(hotelState, {
      ...current,
      requests: close("accepted", { discount }),
      events: [...current.events, event],
      lastOutcome: { requestId, outcome: "signed", discount, total: quote.total, day },
    }),
  };
}

// ---- the days ------------------------------------------------------------------------------------

// One played day: today's new quote (if the calendar brings one), the quotes
// nobody answered in time expire, and the events that ended today are done.
// A no-op for a hotel with no meeting room and no MICE state.
export function advanceMice(hotelState, { date, rooms } = {}) {
  const current = state(hotelState);
  const today = toIsoDate(date);
  const fresh = generateRequest({ hotelState, rooms, date });
  const hasState = current.requests.length > 0 || current.events.length > 0;
  if (!fresh && !hasState) return hotelState;

  const requests = current.requests.map((request) => (request.status === "pending" && (request.expiresOn < today || request.startDate <= today) ? { ...request, status: "expired", closedOn: today } : request));
  const events = current.events.map((event) => (event.status === "confirmed" && event.endDate <= today ? { ...event, status: "done", completedOn: today } : event));
  if (fresh) requests.push(fresh);

  const closed = requests.filter((request) => request.status !== "pending");
  const open = requests.filter((request) => request.status === "pending");
  const done = events.filter((event) => event.status === "done").slice(-KEPT_DONE_EVENTS);
  const confirmed = events.filter((event) => event.status === "confirmed");

  return withState(hotelState, {
    requests: [...closed.slice(-KEPT_CLOSED_REQUESTS), ...open],
    events: [...done, ...confirmed],
    nextId: fresh ? current.nextId + 1 : current.nextId,
    lastOutcome: current.lastOutcome,
  });
}

// ---- reading the events --------------------------------------------------------------------------

export function miceEvents(hotelState) {
  return state(hotelState).events;
}

export function lastOutcome(hotelState) {
  return state(hotelState).lastOutcome;
}

// Events holding on `date` (a confirmed or just-finished one whose days include it).
export function eventsOnDate(hotelState, date) {
  const today = toIsoDate(date);
  return state(hotelState).events.filter((event) => event.startDate <= today && today <= event.endDate);
}

// Confirmed events starting within `days` days after `date`.
export function eventsStartingSoon(hotelState, date, days = 3) {
  const today = toIsoDate(date);
  const limit = isoPlus(date, days);
  return state(hotelState).events.filter((event) => event.status === "confirmed" && event.startDate > today && event.startDate <= limit);
}

// Catering served on `date`, in euros of revenue (restaurant) and food cost.
export function miceCateringRevenueOn(hotelState, date) {
  return eventsOnDate(hotelState, date).reduce((sum, event) => sum + safeNumber(event.cateringPerDay, 0), 0);
}

export function miceCateringCostOn(hotelState, date) {
  return Math.round(miceCateringRevenueOn(hotelState, date) * CATERING_COST_RATE);
}

// What the confirmed events still to come are guaranteed to bring.
export function guaranteedRevenue(hotelState, date) {
  const today = toIsoDate(date ?? new Date());
  return state(hotelState)
    .events.filter((event) => event.status === "confirmed" && event.endDate >= today)
    .reduce((sum, event) => sum + safeNumber(event.quote?.total, 0), 0);
}

// Each meeting room's next `days` days: [{ roomId, number, capacity, days: [{ date, busy }] }],
// `busy` being the event holding there, or "other" for a booking that isn't a
// MICE event.
export function roomCalendar({ hotelState, rooms, reservations, date, days = 14 }) {
  const events = state(hotelState).events;
  return meetingRooms(rooms).map((room) => ({
    roomId: room.id,
    number: room.number,
    capacity: safeNumber(room.capacity, 0),
    days: Array.from({ length: days }, (_, offset) => {
      const day = isoPlus(date, offset);
      const event = events.find((item) => item.meetingRoomId === room.id && item.startDate <= day && day <= item.endDate);
      const taken = safeArray(reservations).some((reservation) => Number(reservation.room_id) === Number(room.id) && !isCancelled(reservation) && String(reservation.arrival).slice(0, 10) <= day && day < String(reservation.departure).slice(0, 10));
      return { date: day, busy: event ? event.id : taken ? "other" : null };
    }),
  }));
}

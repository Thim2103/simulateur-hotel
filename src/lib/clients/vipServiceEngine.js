// Looking after a V.I.P. (see guestProfiles.js): a V.I.P. staying in the hotel
// has a SATISFACTION (0-100) the player can act on BEFORE they leave, because
// what they write at departure -- and its x3 weight on the reputation and on
// the next day's demand -- depends on it.
//
// The satisfaction starts from how the stay is going: a base of 55-85 that is
// theirs alone (a stable hash of the reservation), lowered by a stroke of bad
// luck, by breakdowns left unrepaired, by a run-down hotel, a poor reputation,
// and by shortages of reception or housekeeping staff (waiting, unmade
// rooms); nudged up a little by a hotel in great shape. The player can then
// give attentions, each once per stay:
//
//   upgrade   -- a free upgrade to a free suite, if there is one: +20 to +40
//   gift      -- a welcome gift paid from the treasury: flowers (50 EUR, +12),
//                a bottle of champagne (100 EUR, +20) or a gourmet basket
//                (150 EUR, +28)
//   personal  -- a personal service by an experienced or expert housekeeper or
//                receptionist: cancels the satisfaction lost to waiting and
//                unmade rooms and adds +8; the employee is tied to this guest
//                for the stay
//
// AT DEPARTURE the V.I.P.'s review follows their satisfaction: 5 stars from
// 85, then 4 from 70, 3 from 55, 2 from 40, 1 below. If the attentions took
// them to 85 or more, the review is glowing: a major reputation boost (+3 to
// +5 points on top of the usual weight) and a feature article (see
// guestReviewEngine.js, which reads vipStayOutcome() when a V.I.P. leaves).
//
// State: `hotelState.vipService.stays[reservationId]` = { upgrade, gift,
// personal } (what was given and when). Pure and deterministic (no rng), and
// nothing is stored for a hotel that never gave an attention.
import { safeArray, safeNumber, safeObject } from "../safe";
import { treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { findReservationConflicts } from "../pmsModels";
import { getRoster, hasRoster } from "../staff/staffRoster";
import { hotelCondition } from "../maintenance/maintenanceCostEngine";
import { openIncidents } from "../maintenance/incidentImpact";
import { PROFILES, UNLUCKY_STAY_CHANCE, followersOf, mixedRandom, vipGuestsInHouse } from "./guestProfiles";

export const TARGET_SATISFACTION = 85;
export const BASE_MIN = 55;
export const BASE_SPAN = 30; // base satisfaction is 55..85

export const UNLUCKY_PENALTY = 20;
export const INCIDENT_PENALTY = 15;
export const MAX_INCIDENT_PENALTY = 30;
export const CONDITION_PENALTY = 15;
export const CONDITION_BONUS = 5;
export const REPUTATION_PENALTY = 10;
export const WAITING_PENALTY = 10;
export const CLEANING_PENALTY = 10;

export const UPGRADE_BONUS_MIN = 20;
export const UPGRADE_BONUS_SPAN = 21; // +20..+40
export const PERSONAL_BONUS = 8;
export const PRAISE_BONUS_MIN = 3;
export const PRAISE_BONUS_SPAN = 3; // +3..+5

export const GIFTS = {
  flowers: { id: "flowers", label: "Fleurs & mot d'accueil", cost: 50, bonus: 12 },
  champagne: { id: "champagne", label: "Bouteille de champagne", cost: 100, bonus: 20 },
  basket: { id: "basket", label: "Panier gastronomique", cost: 150, bonus: 28 },
};

// Which staff can look after a V.I.P. personally.
const PERSONAL_ROLES = ["housekeeping", "reception"];
const PERSONAL_LEVELS = ["experienced", "expert"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stays(hotelState) {
  return safeObject(safeObject(safeObject(hotelState).vipService).stays);
}

// What has been given to a V.I.P. during their stay: { upgrade, gift, personal }.
export function vipServiceRecord(hotelState, reservationId) {
  return safeObject(stays(hotelState)[reservationId]);
}

export function hasAttention(record) {
  return !!(record.upgrade || record.gift || record.personal);
}

export function upgradeBonusFor(reservationId) {
  return UPGRADE_BONUS_MIN + Math.floor(mixedRandom(`upgrade:${reservationId}`) * UPGRADE_BONUS_SPAN);
}

export function praiseBonusFor(reservationId) {
  return PRAISE_BONUS_MIN + Math.floor(mixedRandom(`praise:${reservationId}`) * PRAISE_BONUS_SPAN);
}

export function ratingFromSatisfaction(score) {
  if (score >= TARGET_SATISFACTION) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

// ---- the gauge ---------------------------------------------------------------------

// The V.I.P.'s satisfaction and where it comes from: { score, base, reached,
// lines: [{ key, label, value }] } (value is signed, in points).
export function vipSatisfaction({ reservation, hotelState }) {
  const id = safeObject(reservation).id;
  const record = vipServiceRecord(hotelState, id);
  const lines = [];
  const add = (key, label, value) => value !== 0 && lines.push({ key, label, value });

  const base = Math.round(BASE_MIN + mixedRandom(`vipsat:${id}`) * BASE_SPAN);
  const unlucky = mixedRandom(`unlucky:${id}`) < UNLUCKY_STAY_CHANCE ? -UNLUCKY_PENALTY : 0;
  const incidents = -Math.min(MAX_INCIDENT_PENALTY, openIncidents(hotelState).filter((incident) => (incident.daysOpen || 0) >= 1).length * INCIDENT_PENALTY);
  const condition = hotelCondition(hotelState);
  const upkeep = condition < 60 ? -CONDITION_PENALTY : condition >= 90 ? CONDITION_BONUS : 0;
  const reputation = safeNumber(safeObject(safeObject(safeObject(hotelState).progression).player).reputation, 60) < 40 ? -REPUTATION_PENALTY : 0;

  // Waiting and unmade rooms, from the day's staffing snapshot (a hotel with
  // no roster has none of it) -- a personal service cancels both.
  const staffing = safeObject(safeObject(hotelState).staffing);
  const personal = !!record.personal;
  const waiting = !personal && hasRoster(hotelState) && safeNumber(staffing.receptionCoverage, 1) < 1 ? -WAITING_PENALTY : 0;
  const cleaning = !personal && hasRoster(hotelState) && safeNumber(staffing.housekeepingCoverage, 1) < 1 ? -CLEANING_PENALTY : 0;

  add("unlucky", "Séjour malchanceux", unlucky);
  add("incidents", "Pannes non réparées", incidents);
  add("upkeep", upkeep < 0 ? "Hôtel en mauvais état" : "Hôtel impeccable", upkeep);
  add("reputation", "Réputation fragile", reputation);
  add("waiting", "Attente à la réception", waiting);
  add("cleaning", "Ménage en retard", cleaning);
  add("upgrade", "Surclassement en suite", record.upgrade ? safeNumber(record.upgrade.bonus, 0) : 0);
  add("gift", "Cadeau de bienvenue", record.gift ? safeNumber(record.gift.bonus, 0) : 0);
  add("personal", "Service personnalisé", personal ? safeNumber(record.personal.bonus, PERSONAL_BONUS) : 0);

  const score = clamp(Math.round(base + lines.reduce((sum, line) => sum + line.value, 0)), 0, 100);
  return { score, base, reached: score >= TARGET_SATISFACTION, lines };
}

// What a V.I.P. writes when they leave: { satisfaction, rating, praise,
// praiseBonus }. Glowing (`praise`) only when the attentions took them to the
// target -- a stay that was simply flawless gets five stars, nothing more.
export function vipStayOutcome({ reservation, hotelState }) {
  const gauge = vipSatisfaction({ reservation, hotelState });
  const record = vipServiceRecord(hotelState, safeObject(reservation).id);
  const praise = gauge.reached && hasAttention(record);
  return {
    satisfaction: gauge.score,
    rating: ratingFromSatisfaction(gauge.score),
    praise,
    praiseBonus: praise ? praiseBonusFor(safeObject(reservation).id) : 0,
  };
}

// The feature article a glowing V.I.P. review earns.
export function pressHighlightFor({ reservation, review }) {
  const followers = followersOf(reservation);
  const audience = followers >= 100000 ? `${Math.round(followers / 1000)} 000 abonnés` : `${followers.toLocaleString("fr-FR")} abonnés`;
  return {
    id: `press:${review.id}`,
    day: review.day,
    guestName: review.guestName,
    followers,
    headline: `« Un séjour d'exception » — ${review.guestName} encense l'hôtel devant ${audience}`,
    text: review.text,
  };
}

// ---- the V.I.P.s in the hotel -----------------------------------------------------------

// The V.I.P.s staying tonight with their satisfaction and what they were
// given: [{ ...vipGuestsInHouse(), profile, satisfaction, reached, attentions }].
export function describeVipGuests({ hotelState, reservations, rooms, date } = {}) {
  const byId = new Map(safeArray(reservations).map((reservation) => [reservation.id, reservation]));
  return vipGuestsInHouse({ reservations, rooms, date }).map((guest) => {
    const gauge = vipSatisfaction({ reservation: byId.get(guest.reservationId), hotelState });
    const record = vipServiceRecord(hotelState, guest.reservationId);
    return { ...guest, profile: PROFILES.vip, satisfaction: gauge.score, reached: gauge.reached, lines: gauge.lines, attentions: Object.keys(record).filter((key) => record[key]) };
  });
}

// ---- the attentions -----------------------------------------------------------------------

function isBookable(room) {
  return room.status !== "maintenance" && room.status !== "hors_service";
}

// A free suite for the rest of the stay, if there is one.
export function findFreeSuite({ reservation, rooms, reservations }) {
  return safeArray(rooms)
    .filter((room) => room.type === "suite" && isBookable(room) && room.id !== reservation.room_id)
    .sort((a, b) => String(a.number).localeCompare(String(b.number)))
    .find((room) => findReservationConflicts(safeArray(reservations), { ...reservation, room_id: room.id }).length === 0);
}

const busyEmployeeIds = (hotelState, exceptReservationId, inHouseIds) =>
  new Set(
    Object.entries(stays(hotelState))
      .filter(([id, record]) => record.personal && Number(id) !== Number(exceptReservationId) && inHouseIds.has(Number(id)))
      .map(([, record]) => record.personal.employeeId)
  );

// An experienced or expert housekeeper or receptionist who is well, not in
// training and not already looking after another V.I.P. in the hotel.
export function findPersonalServer({ hotelState, reservationId, inHouseIds }) {
  const busy = busyEmployeeIds(hotelState, reservationId, inHouseIds);
  return getRoster(hotelState)
    .filter((employee) => PERSONAL_ROLES.includes(employee.role) && PERSONAL_LEVELS.includes(employee.level) && !employee.sick && !employee.training && !busy.has(employee.id))
    .sort((a, b) => PERSONAL_LEVELS.indexOf(b.level) - PERSONAL_LEVELS.indexOf(a.level) || String(a.name).localeCompare(String(b.name)))[0];
}

// Every attention the player can give a V.I.P. in the hotel, with what it
// costs, what it brings and why it can't be given right now:
// [{ id, type, giftId?, label, description, cost, bonus, available, done, reason }].
export function vipActionOptions({ hotelState, reservations, rooms, date }, reservationId) {
  const guests = vipGuestsInHouse({ reservations, rooms, date });
  const guest = guests.find((item) => item.reservationId === reservationId);
  if (!guest) return [];
  const reservation = safeArray(reservations).find((item) => item.id === reservationId);
  const record = vipServiceRecord(hotelState, reservationId);
  const currentRoom = safeArray(rooms).find((room) => Number(room.id) === Number(reservation.room_id));
  const inHouseIds = new Set(guests.map((item) => Number(item.reservationId)));
  const options = [];

  const suite = findFreeSuite({ reservation, rooms, reservations });
  options.push({
    id: "upgrade",
    type: "upgrade",
    label: "Surclassement immédiat en suite",
    description: "Une suite offerte pour le reste du séjour, au même tarif.",
    cost: 0,
    bonus: `+${UPGRADE_BONUS_MIN} à +${UPGRADE_BONUS_MIN + UPGRADE_BONUS_SPAN - 1}`,
    done: !!record.upgrade,
    available: !record.upgrade && currentRoom?.type !== "suite" && !!suite,
    reason: record.upgrade ? "Déjà accordé" : currentRoom?.type === "suite" ? "Déjà en suite" : suite ? "" : "Aucune suite libre",
  });

  Object.values(GIFTS).forEach((gift) => {
    const affordable = treasuryOf(hotelState) >= gift.cost;
    options.push({
      id: `gift:${gift.id}`,
      type: "gift",
      giftId: gift.id,
      label: gift.label,
      description: "Un cadeau de bienvenue dans la chambre.",
      cost: gift.cost,
      bonus: `+${gift.bonus}`,
      done: !!record.gift,
      available: !record.gift && affordable,
      reason: record.gift ? "Un cadeau a déjà été offert" : affordable ? "" : "Trésorerie insuffisante",
    });
  });

  const server = findPersonalServer({ hotelState, reservationId, inHouseIds });
  options.push({
    id: "personal",
    type: "personal",
    label: "Service personnalisé",
    description: server ? `${server.name} (${server.role === "reception" ? "réception" : "gouvernance"}) s'occupe personnellement du client : plus d'attente ni de ménage en retard.` : "Un gouvernant ou réceptionniste expérimenté s'occupe personnellement du client.",
    cost: 0,
    bonus: `+${PERSONAL_BONUS}, sans attente ni ménage en retard`,
    done: !!record.personal,
    available: !record.personal && !!server,
    reason: record.personal ? "Déjà assigné" : server ? "" : "Aucun gouvernant ou réceptionniste expérimenté disponible",
  });
  return options;
}

// Gives an attention. `action` = { type: "upgrade" } | { type: "gift", giftId }
// | { type: "personal" }. A no-op (same bundle back) unless that attention is
// available for that V.I.P. right now.
export function applyVipAction(hotelBundle, reservationId, action, { day = 0, date = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const context = { hotelState, reservations: bundle.reservations, rooms: bundle.rooms, date };
  const wanted = safeObject(action);
  const optionId = wanted.type === "gift" ? `gift:${wanted.giftId}` : wanted.type;
  const option = vipActionOptions(context, reservationId).find((item) => item.id === optionId);
  if (!option || !option.available) return bundle;

  const reservation = safeArray(bundle.reservations).find((item) => item.id === reservationId);
  const guests = vipGuestsInHouse({ reservations: bundle.reservations, rooms: bundle.rooms, date });
  const inHouseIds = new Set(guests.map((item) => Number(item.reservationId)));
  const previous = stays(hotelState);
  const record = { ...safeObject(previous[reservationId]) };
  let nextHotelState = hotelState;
  let nextReservations = safeArray(bundle.reservations);
  let nextRooms = safeArray(bundle.rooms);

  if (option.type === "upgrade") {
    const suite = findFreeSuite({ reservation, rooms: bundle.rooms, reservations: bundle.reservations });
    const fromRoom = nextRooms.find((room) => Number(room.id) === Number(reservation.room_id));
    record.upgrade = { day, bonus: upgradeBonusFor(reservationId), fromRoomId: reservation.room_id, fromRoomNumber: fromRoom?.number ?? reservation.room, toRoomId: suite.id, toRoomNumber: suite.number };
    nextReservations = nextReservations.map((item) => (item.id === reservationId ? { ...item, room_id: suite.id, room: suite.number, room_type: suite.type } : item));
    // The V.I.P. changes room: the one they left is free again, the suite is taken.
    nextRooms = nextRooms.map((room) => {
      if (Number(room.id) === Number(reservation.room_id) && room.status === "occupée") return { ...room, status: "libre" };
      if (Number(room.id) === Number(suite.id) && fromRoom?.status === "occupée") return { ...room, status: "occupée" };
      return room;
    });
  } else if (option.type === "gift") {
    const gift = GIFTS[option.giftId];
    record.gift = { id: gift.id, label: gift.label, day, cost: gift.cost, bonus: gift.bonus };
    nextHotelState = debitCurrentMonth(nextHotelState, gift.cost);
  } else {
    const server = findPersonalServer({ hotelState, reservationId, inHouseIds });
    record.personal = { day, employeeId: server.id, employeeName: server.name, bonus: PERSONAL_BONUS };
  }

  return {
    ...bundle,
    hotelState: { ...nextHotelState, vipService: { ...safeObject(nextHotelState.vipService), stays: { ...previous, [reservationId]: record } } },
    reservations: nextReservations,
    rooms: nextRooms,
  };
}

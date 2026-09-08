// Pure housekeeping calculations: charge (rooms to clean), temps de
// nettoyage (minutes/chambre), productivité, surcharge, sous-effectif.
// Operates on the same hotel bundle every other engine in this app
// shares ({ hotelState, restaurantState, rooms, reservations } -- see
// lib/guest/guestAdapter.js's createGuestHotelBundle()).
//
// Reuses lib/housekeeping.js's own deriveHousekeepingTasks() (already
// used by pages/PMS.jsx to flag checked-out rooms dirty) as the source
// of truth for which rooms actually need a full clean today, rather
// than re-deriving that logic a second time -- this module only adds
// the workload/productivity/quality/diagnostics layer PMS.jsx never had.
//
// Model note: like lib/finance/financeCalculations.js and
// lib/staff/staffCalculations.js, cleaning-time and productivity are a
// simulator, not a real time-and-motion study -- every constant below is
// a deliberate, disclosed assumption. housekeeperCount reuses
// lib/staff/staffCalculations.js's own HOUSEKEEPING_STAFF_SHARE
// (documented there) so the two modules agree on how many of the
// estimated hotel-side headcount are housekeepers.
import { safeArray, safeNumber, safeObject } from "../safe";
// Explicit ".js" extension: this directory (src/lib/housekeeping/) sits
// alongside the pre-existing src/lib/housekeeping.js utility file --
// Node/webpack resolution picks the flat file over the directory for a
// bare "../housekeeping" specifier (files win over directories), but the
// extension removes any doubt for readers and tooling alike. See this
// file's header for why nothing here duplicates that file's own logic.
import { deriveHousekeepingTasks, HOUSEKEEPING_STAFF } from "../housekeeping.js";

const BASE_MINUTES_DEEP_CLEAN = 35; // a full clean after checkout
const BASE_MINUTES_STAYOVER = 15; // a light daily service for a staying guest
const HOUSEKEEPING_STAFF_SHARE = 0.4; // see lib/staff/staffCalculations.js's own constant of the same name
const ROOMS_PER_HOUSEKEEPER = 12; // see lib/staff/staffCalculations.js's own constant of the same name
const SHIFT_MINUTES = 480; // an 8h housekeeping shift

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toDateOnly(value) {
  return String(value?.toISOString ? value.toISOString() : value).slice(0, 10);
}

function isActiveReservation(reservation) {
  return !String(reservation?.status || "").toLowerCase().includes("annul");
}

// 1. Charge housekeeping: today's real dirty/checkout rooms (from
// lib/housekeeping.js's deriveHousekeepingTasks(), the same logic
// PMS.jsx already runs) plus stayovers needing a lighter daily service
// -- "gérer priorités (arrivées, départs, stayovers)" (section 1).
export function computeWorkload({ rooms, reservations, referenceDate = new Date() } = {}) {
  const { tasks } = deriveHousekeepingTasks(rooms, reservations, HOUSEKEEPING_STAFF, referenceDate);
  const today = toDateOnly(referenceDate);
  const list = safeArray(reservations).filter(isActiveReservation);

  const arrivals = list.filter((reservation) => toDateOnly(reservation.arrival) === today);
  const departures = list.filter((reservation) => toDateOnly(reservation.departure) === today);
  const stayovers = list.filter((reservation) => toDateOnly(reservation.arrival) < today && toDateOnly(reservation.departure) > today);

  return {
    roomsToClean: tasks.length,
    tasks,
    priorities: { arrivals: arrivals.length, departures: departures.length, stayovers: stayovers.length },
  };
}

// 2. Temps de nettoyage: total minutes for today's workload, and the
// resulting average minutes/chambre -- adjusted by trainingLevel/
// processEfficiency (hotelState.housekeeping, see housekeepingActions.js
// for how "optimiser-temps-nettoyage"/"ameliorer-qualite" move them).
export function computeCleaningTime({ roomsToClean = 0, stayovers = 0, trainingLevel = 50, processEfficiency = 50 } = {}) {
  const efficiency = clamp((safeNumber(trainingLevel, 50) + safeNumber(processEfficiency, 50)) / 2, 0, 100);
  const speedFactor = 1.3 - (efficiency / 100) * 0.6; // 1.3x at 0 efficiency, 0.7x at 100
  const deepCleanMinutes = roomsToClean * BASE_MINUTES_DEEP_CLEAN * speedFactor;
  const stayoverMinutes = stayovers * BASE_MINUTES_STAYOVER * speedFactor;
  const totalMinutes = Math.round(deepCleanMinutes + stayoverMinutes);
  const totalRooms = Math.max(1, roomsToClean + stayovers);
  const minutesPerRoom = Math.round((totalMinutes / totalRooms) * 10) / 10;
  return { totalMinutes, minutesPerRoom };
}

// 3. Productivité housekeeping: blends the Staff module's own
// restaurant-team productivity (the only real per-person productivity
// tracked anywhere -- see lib/staff/staffCalculations.js) with
// trainingLevel, penalized by staff overload -- "synchroniser avec Staff
// (productivité, surcharge)" (section 5).
export function computeHousekeepingProductivity({ staffProductivity = 65, staffOverload = 0, trainingLevel = 50 } = {}) {
  const base = safeNumber(staffProductivity, 65) * 0.5 + safeNumber(trainingLevel, 50) * 0.5;
  const overloadPenalty = Math.max(0, safeNumber(staffOverload, 0) - 100) * 0.25;
  return Math.round(clamp(base - overloadPenalty, 0, 100));
}

// 4. Housekeeper count: reuses the estimated hotel-side headcount
// (Staff module) and its own housekeeping share, plus any
// staffingBonus from "reduire-surcharge"/"augmenter-staff" actions.
export function computeHousekeeperCount({ hotelHeadcount = 0, staffingBonus = 0 } = {}) {
  return Math.max(1, Math.round(safeNumber(hotelHeadcount, 0) * HOUSEKEEPING_STAFF_SHARE + safeNumber(staffingBonus, 0)));
}

// 5. Surcharge: today's total cleaning minutes against the team's
// available shift-minutes.
export function detectOverload({ totalMinutes = 0, housekeeperCount = 1 } = {}) {
  const availableMinutes = Math.max(1, housekeeperCount) * SHIFT_MINUTES;
  return Math.round((totalMinutes / availableMinutes) * 100);
}

// 6. Sous-effectif: nominal capacity (rooms a fully-staffed team could
// handle) against today's actual room count, worsened by real staff
// absenteeism -- "synchroniser avec Staff (absentéisme -> sous-effectif
// HK)" (section 5).
export function detectUnderstaffing({ roomsToClean = 0, housekeeperCount = 1, staffAbsenteeism = 0 } = {}) {
  const nominalCapacity = Math.max(1, housekeeperCount) * ROOMS_PER_HOUSEKEEPER;
  const effectiveCapacity = nominalCapacity * (1 - clamp(safeNumber(staffAbsenteeism, 0), 0, 100) / 100);
  const understaffed = roomsToClean > effectiveCapacity;
  const shortfall = Math.max(0, Math.round(roomsToClean - effectiveCapacity));
  return { understaffed, shortfall, nominalCapacity: Math.round(nominalCapacity), effectiveCapacity: Math.round(effectiveCapacity) };
}

export function costOfHousekeeping({ housekeeperCount = 0, averageHotelStaffSalary = 2600 } = {}) {
  return Math.round(safeNumber(housekeeperCount, 0) * safeNumber(averageHotelStaffSalary, 2600));
}

export function resolveHousekeepingSettings(hotelState) {
  const settings = safeObject(safeObject(hotelState).housekeeping);
  return {
    staffingBonus: safeNumber(settings.staffingBonus, 0),
    trainingLevel: clamp(safeNumber(settings.trainingLevel, 50), 0, 100),
    processEfficiency: clamp(safeNumber(settings.processEfficiency, 50), 0, 100),
  };
}

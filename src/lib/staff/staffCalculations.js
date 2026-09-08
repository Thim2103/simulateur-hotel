// Pure HR calculations: headcount, morale, productivity, absenteeism,
// overload (surcharge)/understaffing (sous-effectif), turnover, and
// payroll cost. Operates on the same hotel bundle every other engine in
// this app shares ({ hotelState, restaurantState, rooms, reservations } --
// see lib/guest/guestAdapter.js's createGuestHotelBundle()) plus, when
// available, the latest DailyReport's own staffChanges (see
// lib/dailyCycle/updateStaff.js) for real departures/morale deltas.
//
// Staffing model note: like lib/finance/financeCalculations.js, this is a
// simulator, not a real HRIS -- there is no per-person roster for the
// hotel side of the business anywhere else in the app (only
// restaurantState.staff tracks individual people, with salary/
// productivity/satisfaction -- see lib/dailyCycle/updateStaff.js). Hotel-
// side headcount is therefore estimated from hotelState.finance.payroll
// against a plausible average salary, the same "seed a constant, document
// it" approach financeCalculations.js uses for fixed assets/debt. Every
// constant below is a deliberate, disclosed assumption.
import { safeArray, safeNumber, safeObject } from "../safe";

const AVERAGE_HOTEL_STAFF_SALARY = 2600; // €/month, plausible average for reception/housekeeping/maintenance roles not tracked per-person
const HOUSEKEEPING_STAFF_SHARE = 0.4; // share of the (estimated) hotel-side headcount assumed to be housekeeping
const ROOMS_PER_HOUSEKEEPER = 12; // rooms one housekeeper can properly service per day
const COVERS_PER_SERVER = 20; // covers (seats turned) one server can properly handle per service day
const DEFAULT_PRODUCTIVITY = 65; // same fallback lib/dailyCycle/updateStaff.js uses for a person with no recorded productivity yet
const DEFAULT_SATISFACTION = 70; // same fallback lib/dailyCycle/updateStaff.js uses for a person with no recorded satisfaction yet
const DEFAULT_WELLBEING = 60;
const BASE_ABSENTEEISM_RATE = 4; // %, baseline absenteeism even at perfect morale/workload
const BASE_TURNOVER_RATE = 2; // %, baseline monthly turnover even in a healthy team

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values, fallback) {
  const list = safeArray(values).map((value) => safeNumber(value, null)).filter((value) => value !== null);
  if (!list.length) return fallback;
  return list.reduce((total, value) => total + value, 0) / list.length;
}

// 1. Headcount: real restaurant roster + estimated hotel-side headcount
// (see this file's header for why the latter is estimated).
export function computeHeadcount({ hotelFinance, restaurantStaff } = {}) {
  const hotel = safeObject(hotelFinance);
  const restaurant = safeArray(restaurantStaff);
  const hotelHeadcount = Math.max(0, Math.round(safeNumber(hotel.payroll, 0) / AVERAGE_HOTEL_STAFF_SALARY));
  const restaurantHeadcount = restaurant.length;
  return { hotel: hotelHeadcount, restaurant: restaurantHeadcount, total: hotelHeadcount + restaurantHeadcount };
}

// 2. Moral: blends the real restaurant team's average satisfaction with
// the ESG "bien-être" investment (restaurantState.esg.staffWellbeing) --
// "synchroniser avec ESG (bien-être)" (see the Refonte RH request's
// section 1/5).
export function computeMorale({ restaurantStaff, staffWellbeing } = {}) {
  const teamSatisfaction = average(safeArray(restaurantStaff).map((person) => person.satisfaction), DEFAULT_SATISFACTION);
  const wellbeing = safeNumber(staffWellbeing, DEFAULT_WELLBEING);
  return Math.round(clamp(teamSatisfaction * 0.6 + wellbeing * 0.4, 0, 100));
}

// 3. Surcharge / sous-effectif: how hard PMS (housekeeping, rooms to
// clean) and Restaurant (service, covers to handle) are pushing the
// current headcount relative to a plausible nominal capacity. >100 means
// the team is running above its comfortable capacity; the housekeeping/
// service breakdown lets diagnostics point at which side is overloaded.
export function computeOverload({ roomCount = 0, restaurantSeats = 0, headcount } = {}) {
  const counts = safeObject(headcount);
  const housekeepers = Math.max(1, Math.round(safeNumber(counts.hotel, 0) * HOUSEKEEPING_STAFF_SHARE));
  const servers = Math.max(1, safeNumber(counts.restaurant, 0));

  const housekeepingLoad = Math.round((safeNumber(roomCount, 0) / (housekeepers * ROOMS_PER_HOUSEKEEPER)) * 100);
  const serviceLoad = Math.round((safeNumber(restaurantSeats, 0) / (servers * COVERS_PER_SERVER)) * 100);
  const overload = Math.max(housekeepingLoad, serviceLoad);

  return { housekeepingLoad, serviceLoad, overload };
}

// 4. Absenteeism: low morale and heavy overload both push it up from a
// healthy baseline.
export function computeAbsenteeism({ morale = 0, overload = 0 } = {}) {
  const moralePenalty = Math.max(0, 60 - safeNumber(morale, 0)) * 0.3;
  const overloadPenalty = Math.max(0, safeNumber(overload, 0) - 100) * 0.2;
  return Math.round(clamp(BASE_ABSENTEEISM_RATE + moralePenalty + overloadPenalty, 0, 40));
}

// 5. Productivity: the real restaurant team's average productivity,
// penalized by sustained overload (fatigue).
export function computeProductivity({ restaurantStaff, overload = 0 } = {}) {
  const base = average(safeArray(restaurantStaff).map((person) => person.productivity), DEFAULT_PRODUCTIVITY);
  const overloadPenalty = Math.max(0, safeNumber(overload, 0) - 100) * 0.3;
  return Math.round(clamp(base - overloadPenalty, 0, 100));
}

// 6. Turnover: a monthly-rate estimate driven by morale/overload, plus
// today's real departures (see lib/dailyCycle/updateStaff.js's
// `changes.departures`) when a DailyReport is available -- "synchroniser
// avec careerEngine" (section 1).
export function computeTurnover({ morale = 0, overload = 0, departuresLast = 0, headcount } = {}) {
  const moraleRisk = Math.max(0, 50 - safeNumber(morale, 0)) * 0.4;
  const overloadRisk = Math.max(0, safeNumber(overload, 0) - 100) * 0.15;
  const estimatedRate = Math.round(clamp(BASE_TURNOVER_RATE + moraleRisk + overloadRisk, 0, 50));

  const total = Math.max(1, safeNumber(safeObject(headcount).total, 1));
  const actualRateLastCycle = Math.round(clamp((safeNumber(departuresLast, 0) / total) * 100, 0, 100));

  return { estimatedRate, actualRateLastCycle, departuresLast: safeNumber(departuresLast, 0) };
}

// 7. Coûts RH: hotel-side + restaurant-side payroll -- "synchroniser avec
// Finance (payroll, coûts)" (section 1/5).
export function computePayrollCost({ hotelFinance, restaurantFinance } = {}) {
  const hotel = Math.round(safeNumber(safeObject(hotelFinance).payroll, 0));
  const restaurant = Math.round(safeNumber(safeObject(restaurantFinance).payroll, 0));
  return { hotel, restaurant, total: hotel + restaurant };
}

// Daily expenses: hotel.finance/restaurant.finance carry monthly figures
// (fixedCosts, payroll, rent, marketing budget, ESG investment); this
// prorates them to a single day and adds any one-off costs raised by
// today's events (equipment failures, extra staffing, etc.).
import { rosterDailyPayroll } from "../staff/staffRoster";
import { computeZoneEffects } from "../zones/zoneUpgradesEngine";
import { computeDailyMaintenance } from "../maintenance/maintenanceCostEngine";
import { calendarEffects } from "../hotelEvents/hotelEventsEngine";
import { miceCateringCostOn } from "../mice/miceEngine";

const DAYS_PER_MONTH = 30;

function perDay(monthlyAmount) {
  return Number(monthlyAmount || 0) / DAYS_PER_MONTH;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function eventCosts(events) {
  return safeArray(events).reduce((sum, event) => sum + Number(event?.impact?.expenses || 0), 0);
}

// Splits today's spend into fixed (rent, base payroll, fixed costs) and
// variable (marketing, ESG investment, restaurant staff payroll, one-off
// event costs) so the daily report can show where money is going.
export function calculateExpenses({ hotelState = {}, restaurantState = {}, events = [], rooms = [], referenceDate } = {}) {
  const hotelFinance = hotelState.finance || {};
  const restaurantFinance = restaurantState.finance || {};
  const restaurantStaff = safeArray(restaurantState.staff);
  // Upkeep of the rooms, built floors and installed equipment, at the
  // player's maintenance level (lib/maintenance/maintenanceCostEngine.js).
  const maintenance = computeDailyMaintenance({ hotelState, rooms });

  const fixed =
    perDay(hotelFinance.fixedCosts) +
    perDay(hotelFinance.payroll) +
    perDay(restaurantFinance.fixedCosts) +
    perDay(restaurantFinance.rent) +
    // The named hotel-side roster's daily salaries (lib/staff/staffRoster.js)
    // -- 0 for a hotel with no roster, so nothing changes for it.
    rosterDailyPayroll(hotelState) -
    // Daily running-cost savings from installed zone upgrades (domotics,
    // heat recovery... see lib/zones/); 0 for a hotel that never upgraded.
    computeZoneEffects(hotelState).energySavingsDaily +
    maintenance.total;

  const restaurantPayroll = restaurantStaff.reduce((sum, person) => sum + Number(person.salary || 0), 0);

  const variable =
    perDay(hotelState.marketing?.budget) +
    perDay(hotelState.esg?.monthlyInvestment) +
    perDay(restaurantState.marketing?.budget) +
    perDay(restaurantState.esg?.monthlyInvestment) +
    perDay(restaurantPayroll) +
    eventCosts(events) +
    // A heat or cold wave (lib/hotelEvents/) raises the energy bill that day.
    (referenceDate ? calendarEffects(referenceDate, hotelState).energyExtra : 0) +
    // The food cost of the seminar catering served today (lib/mice/).
    (referenceDate ? miceCateringCostOn(hotelState, referenceDate) : 0);

  const total = Math.max(0, fixed + variable);

  return {
    fixed: Math.round(fixed),
    variable: Math.round(variable),
    eventCosts: Math.round(eventCosts(events)),
    // "Entretien & Charges d'exploitation": already inside `fixed` and `total`.
    maintenance,
    total: Math.round(total),
  };
}

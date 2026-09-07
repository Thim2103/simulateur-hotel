// Orchestrates one restaurant cycle in step with the hotel's own daily
// cycle (see lib/dailyCycle/runDailyCycle.js, which calls this once per
// hotel -- and therefore, transitively, so does
// lib/multiHotel/chainEngine.js, once per hotel in the chain): sync with
// PMS (occupancy/guests), sync with RM (demand), fold in eventEngine's
// restaurant-relevant events, simulate operations/menu/staff, and return a
// RestaurantReport plus the restaurant state to carry into tomorrow.
//
// This file owns operations/menu/staff *metrics* and the operations task
// list. It does not own restaurant_finance's persisted revenue/costs
// history or the staff array itself -- those stay with
// lib/dailyCycle/updateFinance.js, lib/dailyCycle/updateStaff.js and
// lib/staffMulti/ (multi-site transfers/training/promotions), so this
// engine's output folds in additively without double-counting money or
// moving staff on its own.
import { safeArray, safeNumber } from "../safe";
import { simulateOperations, resolveOperationsTasks } from "./restaurantOperations";
import { computeRestaurantFinanceSummary } from "./restaurantFinance";
import { topPerformers, underperformers } from "./restaurantMenu";
import { computeStaffSatisfactionAvg, headcount } from "./restaurantStaff";
import { deriveRestaurantImpact } from "./restaurantEvents";
import { deriveDemandFromRM } from "./restaurantRM";
import { createInitialRestaurantState } from "./restaurantState";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

function isConfirmed(reservation) {
  return String(reservation?.status || "").toLowerCase().includes("confirm");
}

// Reads the hotel side of the sync directly from rooms/reservations rather
// than a separate event bus (replacing lib/pmsRestaurantBridge.js's
// CustomEvent plumbing, which only worked for a live browser tab and never
// reached runDailyCycle()).
function derivePmsSync({ rooms = [], reservations = [], occupiedRooms = 0 } = {}) {
  const totalRooms = safeArray(rooms, []).length;
  const hotelOccupancy = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const activeGuests = safeArray(reservations, [])
    .filter(isConfirmed)
    .reduce((sum, reservation) => sum + safeNumber(reservation.guests ?? reservation.adults, 1), 0);

  return { hotelOccupancy, activeGuests, housekeepingIssues: 0, scheduledEvents: 0 };
}

// options:
//   hotelState: the hotel bundle's own state (read-only here).
//   restaurantState: the restaurant state to run the cycle against (falls
//     back to a freshly-seeded empty state if none is provided).
//   rooms/reservations: today's PMS state (see pmsRepository.js).
//   occupiedRooms: today's hotel occupancy, as already computed by
//     calculateHotelRevenue() -- passed in rather than recomputed so both
//     stay consistent within the same cycle.
//   rmReport: today's RM report (see lib/rm/rmEngine.js), used to bias
//     restaurant demand off the hotel's own forecast.
//   events: today's DailyReport-shaped events (see lib/events/eventEngine.js).
//   referenceDate: the simulated "today".
export function runRestaurantCycle({
  hotelState = {},
  restaurantState,
  rooms = [],
  reservations = [],
  occupiedRooms = 0,
  rmReport = null,
  events = [],
  referenceDate = new Date(),
} = {}) {
  const state = restaurantState || createInitialRestaurantState();

  const pmsSync = derivePmsSync({ rooms, reservations, occupiedRooms });
  const rmSync = deriveDemandFromRM({ rmReport, hotelOccupancyPercent: pmsSync.hotelOccupancy });
  const eventImpact = deriveRestaurantImpact(events);

  const metrics = simulateOperations(state, { rmSync, eventImpact });
  const nextOperations = resolveOperationsTasks(state.operations, metrics, eventImpact);
  const financeSummary = computeRestaurantFinanceSummary(state);

  const nextState = {
    ...state,
    operations: nextOperations,
    pmsContext: pmsSync,
  };

  const report = {
    date: toDateOnly(referenceDate),
    demand: metrics.demand,
    rushHour: metrics.rushHour,
    complaints: metrics.complaints,
    maintenanceRisk: metrics.maintenanceRisk,
    customerSatisfaction: metrics.customerSatisfaction,
    finance: financeSummary,
    staff: { productivity: metrics.staffProductivity, satisfactionAvg: computeStaffSatisfactionAvg(state.staff), headcount: headcount(state.staff) },
    menu: { popularity: metrics.menuPopularity, topPerformers: topPerformers(state.menu), underperformers: underperformers(state.menu) },
    rm: rmSync,
    pms: pmsSync,
    events: eventImpact.relevantEvents,
  };

  return { report, restaurantState: nextState };
}

export const restaurantEngine = { runRestaurantCycle };
export default restaurantEngine;

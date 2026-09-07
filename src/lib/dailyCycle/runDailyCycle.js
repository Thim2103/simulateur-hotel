// Orchestrates one simulated day end-to-end: load state, compute today's
// hotel/restaurant revenue and expenses, apply random events, update staff
// and reservations, fold the results into finance, persist, and return a
// DailyReport for the UI. Every step is a small pure function in this
// folder; this file only wires them together and talks to the repositories.
import { getHotelState } from "../hotelRepository";
import { getRestaurantState } from "../restaurantRepository";
import { listReservations, listRooms } from "../pmsRepository";
import { calculateHotelRevenue } from "./calculateHotelRevenue";
import { calculateRestaurantRevenue } from "./calculateRestaurantRevenue";
import { calculateExpenses } from "./calculateExpenses";
import { updateStaff } from "./updateStaff";
import { generateEvents } from "../events";
import { runRM } from "../rm";
import { runProgression } from "../progression";
import { updateReservations } from "./updateReservations";
import { updateFinance } from "./updateFinance";
import { saveDailyState } from "./saveDailyState";

function toDateOnly(referenceDate) {
  return String(referenceDate.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// Step 1: load whatever state the caller didn't already provide. Passing
// hotelState/restaurantState/rooms/reservations explicitly (as the tests do)
// skips the corresponding repository call entirely, so the rest of the
// pipeline never needs a live Supabase connection to be exercised.
async function loadDailyCycleState({ hotelState, restaurantState, rooms, reservations }) {
  const [loadedHotelState, loadedRestaurantState, loadedRooms, loadedReservations] = await Promise.all([
    hotelState ?? getHotelState(),
    restaurantState ?? getRestaurantState(),
    rooms ?? listRooms(),
    reservations ?? listReservations(),
  ]);
  return { hotelState: loadedHotelState, restaurantState: loadedRestaurantState, rooms: loadedRooms, reservations: loadedReservations };
}

// Step 10: shape the pipeline's results into the DailyReport contract
// consumed by the UI.
function buildDailyReport({ referenceDate, hotelRevenue, restaurantRevenue, expenses, profit, events, staffChanges, reservationsChanges, rmReport, progressionReport }) {
  return {
    date: toDateOnly(referenceDate),
    hotelRevenue,
    restaurantRevenue,
    expenses,
    profit: Math.round(profit),
    events,
    staffChanges,
    reservationsChanges,
    rmReport,
    progressionReport,
  };
}

// options:
//   hotelState/restaurantState/rooms/reservations: pass explicitly to run
//     the pipeline against in-memory state (tests, previews) instead of
//     Supabase.
//   referenceDate: the simulated "today" (default: now).
//   rng: injectable randomness for the event engine/updateStaff() (default:
//     Math.random).
//   persist: set to false to compute a DailyReport without saving anything
//     (a dry-run/preview).
export async function runDailyCycle(options = {}) {
  const { referenceDate = new Date(), rng = Math.random, persist = true } = options;

  // 1. Load hotel, restaurant, and PMS state.
  const { hotelState, restaurantState, rooms, reservations } = await loadDailyCycleState(options);

  // 7. Update reservations (check-in/check-out/no-show) first: hotel
  // revenue and occupancy for the rest of the pipeline depend on it.
  const reservationUpdate = updateReservations({ rooms, reservations, referenceDate });

  // 2. Hotel revenue (rooms, upsells, OTA commission).
  const hotelRevenue = calculateHotelRevenue({ reservations: reservationUpdate.reservations, referenceDate });

  // 3. Restaurant revenue (sales, margin, VAT).
  const restaurantRevenue = calculateRestaurantRevenue({ menu: restaurantState.menu, finance: restaurantState.finance, referenceDate });

  // 6. Daily events -- weather, VIPs, restaurant rushes, inspections, power
  // outages, staff strikes, reviews, technical incidents, local events (see
  // lib/events/). Multi-day events carry over via hotelState.progression
  // .activeEvents, rolled before expenses/staff so their impact feeds both.
  const { events, impacts, activeEvents } = generateEvents({
    hotelState,
    restaurantState,
    pmsState: { rooms: reservationUpdate.rooms, reservations: reservationUpdate.reservations },
    activeEvents: hotelState.progression?.activeEvents,
    referenceDate,
    rng,
  });

  // 4. Fixed and variable expenses (event costs included).
  const expenses = calculateExpenses({ hotelState, restaurantState, events });

  // 5. Staff fatigue, morale, and turnover. Today's demand is approximated
  // from actual occupancy, so a busy day tires staff out faster.
  const demand = rooms.length ? Math.round((hotelRevenue.occupiedRooms / rooms.length) * 100) : 60;
  const staffUpdate = updateStaff({ staff: restaurantState.staff, demand, eventStaffImpact: impacts.staff, rng });

  // Revenue management: segmentation -> pickup -> forecast -> dynamic
  // pricing -> recommendations (see lib/rm/rmEngine.js). Weather/local
  // event/VIP impacts from today's events feed the pricing adjustments.
  const rmReport = runRM({
    rooms: reservationUpdate.rooms,
    reservations: reservationUpdate.reservations,
    restaurantDemand: demand,
    activeEvents,
    referenceDate,
  });

  // 8. Fold today's numbers into the hotel/restaurant finance objects.
  const hotelRevenueTotal = hotelRevenue.netRevenue + impacts.revenue;
  const restaurantRevenueTotal = restaurantRevenue.netRevenue;
  const financeUpdate = updateFinance({
    hotelState,
    restaurantState,
    hotelRevenue: hotelRevenueTotal,
    restaurantRevenue: restaurantRevenueTotal,
    expenses: expenses.total,
    referenceDate,
  });
  const profit = hotelRevenueTotal + restaurantRevenueTotal - expenses.total;

  const nextRestaurantState = { ...restaurantState, finance: financeUpdate.restaurantFinance, staff: staffUpdate.staff };

  // Player progression: reputation -> xp -> level -> objectives ->
  // achievements -> rewards -> storyline (see lib/progression/). Runs last
  // so it can see the day's full results (profit, events, updated staff).
  const dailyReportSoFar = {
    hotelRevenue: { ...hotelRevenue, eventRevenue: Math.round(impacts.revenue) },
    restaurantRevenue,
    expenses,
    profit,
    events,
    staffChanges: staffUpdate.changes,
    reservationsChanges: reservationUpdate.changes,
    rmReport,
  };
  const progression = runProgression({
    hotelState,
    restaurantState: nextRestaurantState,
    rooms: reservationUpdate.rooms,
    dailyReport: dailyReportSoFar,
  });

  const nextHotelState = {
    ...hotelState,
    finance: financeUpdate.hotelFinance,
    progression: {
      ...hotelState.progression,
      cycles: progression.cycles,
      // Multi-day events (e.g. a 3-day heatwave) and the player's running
      // xp/level/reputation/achievements both ride along in the same
      // jsonb `progression` column hotelRepository.js already persists as
      // -is, so neither needed a schema change.
      activeEvents,
      player: progression.player,
    },
  };

  // 9. Persist (user_id = auth.uid() is applied inside each repository).
  if (persist) {
    await saveDailyState({
      hotelState: nextHotelState,
      restaurantState: nextRestaurantState,
      rooms: reservationUpdate.rooms.filter((room) => reservationUpdate.changedRoomIds.includes(room.id)),
      reservations: reservationUpdate.reservations.filter((reservation) => reservationUpdate.changedReservationIds.includes(reservation.id)),
    });
  }

  // 10. Return the DailyReport for the UI.
  return buildDailyReport({
    referenceDate,
    ...dailyReportSoFar,
    progressionReport: progression.report,
  });
}

// Orchestrates one simulated day across an entire hotel chain: run
// runDailyCycle() for each hotel, consolidate finance and RM, apply
// regional/global events, run multi-site staff management (see
// lib/staffMulti/), update the chain's own progression, and return a
// ChainReport. Every step is a small pure (or, for step 1, async) function
// in this folder; this file only wires them together.
import { runDailyCycle } from "../dailyCycle/runDailyCycle";
import { consolidateFinance } from "./chainFinance";
import { consolidateRM } from "./chainRM";
import { applyRegionalEvents } from "./chainEvents";
import { updateChainProgression } from "./chainProgression";
import { runStaffEngine } from "../staffMulti/staffEngine";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// Applies a regional/global percentage adjustment on top of a hotel's own
// daily profit -- see chainEvents.js: these events are reported and folded
// into the chain-wide totals without needing a second pass through each
// hotel's own finance pipeline.
function applyAdjustment(dailyReport, adjustment) {
  if (!adjustment) return dailyReport;
  const revenueDelta =
    (Number(dailyReport?.hotelRevenue?.netRevenue || 0) + Number(dailyReport?.restaurantRevenue?.netRevenue || 0)) *
    (adjustment.revenuePercent || 0);
  const expensesDelta = Number(dailyReport?.expenses?.total || 0) * (adjustment.expensesPercent || 0);
  return { ...dailyReport, profit: Number(dailyReport.profit || 0) + revenueDelta - expensesDelta };
}

// options:
//   hotels: the chain's hotel bundles (see hotelFactory.js/chainState.js) --
//     each { id, name, city, persist, hotelState, restaurantState, rooms,
//     reservations }.
//   chainProgressionState: the chain's persisted { xp, unlockedAchievements }
//     from the previous cycle (see chainProgression.js).
//   referenceDate/rng: forwarded to every hotel's runDailyCycle() call.
export async function runChainCycle({ hotels = [], chainProgressionState = {}, referenceDate = new Date(), rng = Math.random } = {}) {
  const safeHotels = safeArray(hotels);

  // 1. Run runDailyCycle() for each hotel.
  const rawResults = await Promise.all(
    safeHotels.map(async (hotel) => {
      const dailyReport = await runDailyCycle({
        hotelState: hotel.hotelState,
        restaurantState: hotel.restaurantState,
        rooms: hotel.rooms,
        reservations: hotel.reservations,
        referenceDate,
        rng,
        persist: Boolean(hotel.persist),
      });
      return { hotel, dailyReport };
    })
  );

  // 4. Apply regional/global events on top of each hotel's own results.
  const { regionalEvents, globalEvents, adjustmentsByHotelId } = applyRegionalEvents({ hotels: safeHotels, rng });
  const results = rawResults.map(({ hotel, dailyReport }) => ({
    hotel,
    dailyReport: applyAdjustment(dailyReport, adjustmentsByHotelId[hotel.id]),
  }));

  // 2. Consolidate finance.
  const finance = consolidateFinance(results);

  // 3. Consolidate RM.
  const rm = consolidateRM(results);

  // 5. Update the chain's own progression.
  const { progression, nextState: nextChainProgressionState } = updateChainProgression({
    results,
    totalProfit: finance.totalProfit,
    previousState: chainProgressionState,
  });

  const hotelsAfterDailyCycle = results.map(({ hotel, dailyReport }) => ({
    ...hotel,
    hotelState: dailyReport.nextState?.hotelState ?? hotel.hotelState,
    restaurantState: dailyReport.nextState?.restaurantState ?? hotel.restaurantState,
    rooms: dailyReport.nextState?.rooms ?? hotel.rooms,
    reservations: dailyReport.nextState?.reservations ?? hotel.reservations,
  }));

  // Multi-site staff management (transfers/training/promotions/regional HR
  // events -- see lib/staffMulti/staffEngine.js) runs on top of today's
  // already-updated staff, so it can move/train/promote people who just
  // survived the day's own fatigue/morale/turnover pass. Its changes take
  // effect starting with tomorrow's cycle rather than retroactively
  // altering today's already-computed finance/RM figures.
  const { report: staffReport, hotels: nextHotels } = runStaffEngine({ hotels: hotelsAfterDailyCycle, rng });

  // 6. Return the ChainReport, the updated hotel bundles (so the caller can
  // persist/replace them in chain state -- see useChain.js), and the chain
  // progression state to carry into tomorrow's cycle.
  const report = {
    date: toDateOnly(referenceDate),
    hotels: results.map(({ hotel, dailyReport }) => ({ id: hotel.id, name: hotel.name, city: hotel.city, dailyReport })),
    finance: { totalRevenue: finance.totalRevenue, totalExpenses: finance.totalExpenses, totalProfit: finance.totalProfit },
    rm,
    progression,
    events: { regionalEvents, globalEvents },
    staff: staffReport,
  };

  return { report, hotels: nextHotels, chainProgressionState: nextChainProgressionState };
}

export const chainEngine = { runChainCycle };
export default chainEngine;

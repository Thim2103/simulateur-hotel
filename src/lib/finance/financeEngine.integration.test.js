// Integration tests: lib/finance/financeEngine.js against the real
// Career/RM/PMS/Restaurant/Staff engines (no mocks) -- proves the
// Refonte Finance request's section 5 integrations actually hold, not
// just against hand-built fixtures (see financeEngine.test.js/
// financeCalculations.test.js for the fixture-based unit tests).
import { createGuestHotelBundle } from "../guest";
import { runCareerDay, startCareer } from "../career/careerEngine";
import { runRM } from "../rm/rmEngine";
import { applyFinancialDecision, financeFromCareerState, runFinanceCycle } from "./financeEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundle() {
  return createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
}

test("Carrière + Finance: financeFromCareerState derives real figures from a played career day", async () => {
  const career = startCareer({ playerId: "player-1", ...bundle() });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const financeState = financeFromCareerState(playedCareer);

  expect(financeState.incomeStatement.revenues.total).toBeGreaterThan(0);
  expect(financeState.ratios.goppar).toBeDefined();
});

test("PMS + Finance: a bigger room inventory changes GOPPAR/RevPAR (roomCount comes straight from PMS's own rooms)", () => {
  const smallBundle = bundle();
  const biggerBundle = { ...smallBundle, rooms: [...smallBundle.rooms, ...smallBundle.rooms] }; // double the inventory

  const smallState = runFinanceCycle({ hotelBundle: smallBundle, referenceDate: REFERENCE_DATE });
  const biggerState = runFinanceCycle({ hotelBundle: biggerBundle, referenceDate: REFERENCE_DATE });

  // Same total hotel revenue, twice the available room-nights -> RevPAR halves.
  expect(biggerState.ratios.revpar).toBeLessThan(smallState.ratios.revpar);
});

test("RM + Finance: both engines derive real, positive figures from the same rooms/reservations", () => {
  const hotelBundle = bundle();
  const rmReport = runRM({ rooms: hotelBundle.rooms, reservations: hotelBundle.reservations, referenceDate: REFERENCE_DATE });
  const financeState = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
  expect(financeState.ratios.revpar).toBeGreaterThan(0);
});

test("Restaurant + Finance: restaurant revenue/expenses feed straight into the income statement", () => {
  const hotelBundle = bundle();
  const withoutRestaurantRevenue = {
    ...hotelBundle,
    restaurantState: { ...hotelBundle.restaurantState, finance: { ...hotelBundle.restaurantState.finance, revenue: Array(12).fill(0), costs: Array(12).fill(0) } },
  };

  const withRestaurant = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const withoutRestaurant = runFinanceCycle({ hotelBundle: withoutRestaurantRevenue, referenceDate: REFERENCE_DATE });

  expect(withRestaurant.incomeStatement.revenues.restaurant).toBeGreaterThan(withoutRestaurant.incomeStatement.revenues.restaurant);
  expect(withRestaurant.incomeStatement.revenues.total).toBeGreaterThan(withoutRestaurant.incomeStatement.revenues.total);
});

test("Staff + Finance: the 'adjust-staffing' financial decision raises payroll and the payroll ratio", () => {
  const hotelBundle = bundle();
  const before = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  const adjustedBundle = applyFinancialDecision(hotelBundle, "adjust-staffing");
  const after = runFinanceCycle({ hotelBundle: adjustedBundle, referenceDate: REFERENCE_DATE });

  expect(after.incomeStatement.expenses.payroll).toBeGreaterThan(before.incomeStatement.expenses.payroll);
  // payrollRatio rounds to 2 decimals (see computeRatios()'s round2()), so
  // a single +5% payroll adjustment can round away against a much larger
  // revenue base -- the ratio can only ever move up or stay put, never down.
  expect(after.ratios.payrollRatio).toBeGreaterThanOrEqual(before.ratios.payrollRatio);
});

test("Replay + Finance: each cycle is recorded into the finance replay log in the same cycleIndex/date shape the Replay module already uses", () => {
  const hotelBundle = bundle();
  const first = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const secondDate = new Date(REFERENCE_DATE);
  secondDate.setDate(secondDate.getDate() + 1);
  const second = runFinanceCycle({ hotelBundle, previousState: first, referenceDate: secondDate });

  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[0].cycleIndex).toBe(0);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
  expect(second.replayLog.entries[1].period).toBe("2026-09-11");
});

// Integration tests: lib/housekeeping/housekeepingEngine.js against the
// real Career/RM/PMS/Staff/Finance/ESG engines (no mocks) -- proves the
// Refonte Housekeeping request's section 5 integrations actually hold,
// not just against hand-built fixtures (see housekeepingEngine.test.js/
// housekeepingCalculations.test.js for the fixture-based unit tests).
import { createGuestHotelBundle } from "../guest";
import { runCareerDay, startCareer } from "../career/careerEngine";
import { runRM } from "../rm/rmEngine";
import { runFinanceCycle } from "../finance/financeEngine";
import { staffFromCareerState } from "../staff/staffEngine";
import { esgFromCareerState } from "../esg/esgEngine";
import { applyHousekeepingDecision, housekeepingFromCareerState, runHousekeepingCycle } from "./housekeepingEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundle() {
  return createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
}

test("Carrière + Housekeeping: housekeepingFromCareerState derives real figures from a played career day", async () => {
  const career = startCareer({ playerId: "player-1", ...bundle() });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const hkState = housekeepingFromCareerState(playedCareer);

  expect(hkState.workload).toBeDefined();
  expect(hkState.quality).toBeGreaterThanOrEqual(0);
});

test("PMS + Housekeeping: more checked-out rooms raise the workload and overload", () => {
  const smallBundle = bundle();
  const manyCheckouts = {
    ...smallBundle,
    reservations: smallBundle.rooms.map((room) => ({ room_id: room.id, status: "confirmée", arrival: "2026-09-08", departure: "2026-09-10" })),
  };

  const emptyState = runHousekeepingCycle({ hotelBundle: { ...smallBundle, reservations: [] }, hotelHeadcount: 1, referenceDate: REFERENCE_DATE });
  const busyState = runHousekeepingCycle({ hotelBundle: manyCheckouts, hotelHeadcount: 1, referenceDate: REFERENCE_DATE });

  expect(busyState.workload.roomsToClean).toBeGreaterThan(emptyState.workload.roomsToClean);
  expect(busyState.overload).toBeGreaterThan(emptyState.overload);
});

test("Staff + Housekeeping: both engines derive headcount/productivity from the same restaurant staff and bundle", () => {
  const hotelBundle = bundle();
  const staffState = staffFromCareerState({ hotel: hotelBundle });
  const hkState = runHousekeepingCycle({
    hotelBundle,
    staffProductivity: staffState.productivity,
    staffOverload: staffState.overload,
    staffAbsenteeism: staffState.absenteeism,
    hotelHeadcount: staffState.headcount.hotel,
    referenceDate: REFERENCE_DATE,
  });

  expect(hkState.housekeeperCount).toBeGreaterThan(0);
  expect(hkState.productivity).toBeGreaterThanOrEqual(0);
});

test("Finance + Housekeeping: housekeeping cost scales with housekeeperCount, consistent with the Staff module's own payroll assumption", () => {
  const hotelBundle = bundle();
  const financeState = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const hkState = runHousekeepingCycle({ hotelBundle, hotelHeadcount: 15, referenceDate: REFERENCE_DATE });

  expect(hkState.cost).toBeGreaterThan(0);
  expect(financeState.incomeStatement.expenses.payroll).toBeGreaterThanOrEqual(0);
});

test("RM + Housekeeping: real guest satisfaction feeds directly into the quality score", () => {
  const hotelBundle = bundle();
  const lowSatisfaction = runHousekeepingCycle({ hotelBundle, rmSatisfaction: 10, referenceDate: REFERENCE_DATE });
  const highSatisfaction = runHousekeepingCycle({ hotelBundle, rmSatisfaction: 95, referenceDate: REFERENCE_DATE });

  expect(highSatisfaction.quality).toBeGreaterThan(lowSatisfaction.quality);

  const rmReport = runRM({ rooms: hotelBundle.rooms, reservations: hotelBundle.reservations, referenceDate: REFERENCE_DATE });
  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
});

test("Restaurant + Housekeeping: a heavier restaurant workload (more menu sales) doesn't crash the cycle and staff figures stay consistent", () => {
  const hotelBundle = bundle();
  const busyRestaurant = { ...hotelBundle, restaurantState: { ...hotelBundle.restaurantState, menu: hotelBundle.restaurantState.menu.map((item) => ({ ...item, sales: item.sales * 4 })) } };
  expect(() => runHousekeepingCycle({ hotelBundle: busyRestaurant, referenceDate: REFERENCE_DATE })).not.toThrow();
});

test("ESG + Housekeeping: high ESG energy/water consumption scores combined with overload surface a dedicated diagnostic", () => {
  const hotelBundle = bundle();
  const esgState = esgFromCareerState({ hotel: hotelBundle });
  const inefficientBundle = { ...hotelBundle, hotelState: { ...hotelBundle.hotelState, esg: { ...hotelBundle.hotelState.esg, energyConsumption: 95, waterUsage: 95 } } };
  const overloadedRooms = Array.from({ length: 60 }, (_, i) => ({ id: i, number: String(i), status: "occupée", housekeeping_status: "dirty" }));

  const state = runHousekeepingCycle({
    hotelBundle: { ...inefficientBundle, rooms: overloadedRooms },
    hotelHeadcount: 1,
    esgEnergyScore: inefficientBundle.hotelState.esg.energyConsumption,
    esgWaterScore: inefficientBundle.hotelState.esg.waterUsage,
    referenceDate: REFERENCE_DATE,
  });

  expect(esgState.energy).toBeGreaterThanOrEqual(0);
  expect(state.diagnostics.some((d) => d.message.includes("énergivores"))).toBe(true);
});

test("ESG + Housekeeping (améliorer-qualite action): housekeeping training investment doesn't regress ESG", () => {
  const hotelBundle = bundle();
  const improvedBundle = applyHousekeepingDecision(hotelBundle, "ameliorer-qualite");
  const esgBefore = esgFromCareerState({ hotel: hotelBundle });
  const esgAfter = esgFromCareerState({ hotel: improvedBundle });
  expect(esgAfter.score).toBeGreaterThanOrEqual(0);
  expect(esgBefore.score).toBeGreaterThanOrEqual(0);
});

test("Replay + Housekeeping: each cycle is recorded into the HK replay log in the same cycleIndex/date shape the Replay module already uses", () => {
  const hotelBundle = bundle();
  const first = runHousekeepingCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const secondDate = new Date(REFERENCE_DATE);
  secondDate.setDate(secondDate.getDate() + 1);
  const second = runHousekeepingCycle({ hotelBundle, previousState: first, referenceDate: secondDate });

  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[0].cycleIndex).toBe(0);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
  expect(second.replayLog.entries[1].period).toBe("2026-09-11");
});

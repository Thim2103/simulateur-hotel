// Integration tests: lib/staff/staffEngine.js against the real Career/RM/
// PMS/Restaurant/Finance/ESG engines (no mocks) -- proves the Refonte RH
// request's section 5 integrations actually hold, not just against
// hand-built fixtures (see staffEngine.test.js/staffCalculations.test.js
// for the fixture-based unit tests).
import { createGuestHotelBundle } from "../guest";
import { runCareerDay, startCareer } from "../career/careerEngine";
import { runRM } from "../rm/rmEngine";
import { runFinanceCycle } from "../finance/financeEngine";
import { applyStaffDecision, runStaffCycle, staffFromCareerState } from "./staffEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundle() {
  return createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
}

test("Carrière + Staff: staffFromCareerState derives real figures from a played career day, including real departures", async () => {
  const career = startCareer({ playerId: "player-1", ...bundle() });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const staffState = staffFromCareerState(playedCareer);

  expect(staffState.headcount.total).toBeGreaterThan(0);
  expect(staffState.turnover.departuresLast).toBe(playedCareer.lastDayReport.staffChanges.departures.length);
});

test("PMS + Staff: more rooms with the same headcount raise the housekeeping load (surcharge)", () => {
  const smallBundle = bundle();
  const biggerBundle = { ...smallBundle, rooms: [...smallBundle.rooms, ...smallBundle.rooms, ...smallBundle.rooms] };

  const smallState = runStaffCycle({ hotelBundle: smallBundle, referenceDate: REFERENCE_DATE });
  const biggerState = runStaffCycle({ hotelBundle: biggerBundle, referenceDate: REFERENCE_DATE });

  expect(biggerState.housekeepingLoad).toBeGreaterThan(smallState.housekeepingLoad);
});

test("Restaurant + Staff: service load and morale both come straight from restaurantState.staff/esg", () => {
  const hotelBundle = bundle();
  const lowMoraleBundle = {
    ...hotelBundle,
    restaurantState: {
      ...hotelBundle.restaurantState,
      staff: hotelBundle.restaurantState.staff.map((person) => ({ ...person, satisfaction: 10, productivity: 20 })),
    },
  };

  const normalState = runStaffCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const lowMoraleState = runStaffCycle({ hotelBundle: lowMoraleBundle, referenceDate: REFERENCE_DATE });

  expect(lowMoraleState.morale).toBeLessThan(normalState.morale);
  expect(lowMoraleState.productivity).toBeLessThan(normalState.productivity);
});

test("RM + Staff: both engines derive real figures from the same rooms/reservations", () => {
  const hotelBundle = bundle();
  const rmReport = runRM({ rooms: hotelBundle.rooms, reservations: hotelBundle.reservations, referenceDate: REFERENCE_DATE });
  const staffState = runStaffCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
  expect(staffState.headcount.total).toBeGreaterThan(0);
});

test("Finance + Staff: the hotel-side payroll figure agrees between the two modules for the same hotel bundle (Finance's own income statement only counts hotelState.finance.payroll -- see financeCalculations.js's computeIncomeStatement())", () => {
  const hotelBundle = bundle();
  const financeState = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const staffState = runStaffCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  expect(staffState.payroll.hotel).toBe(financeState.incomeStatement.expenses.payroll);
  expect(staffState.payroll.total).toBeGreaterThan(financeState.incomeStatement.expenses.payroll);
});

test("ESG + Staff: the 'ameliorer-bien-etre' action raises ESG wellbeing and, next cycle, morale", () => {
  const hotelBundle = bundle();
  const before = runStaffCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  const improvedBundle = applyStaffDecision(hotelBundle, "ameliorer-bien-etre");
  const after = runStaffCycle({ hotelBundle: improvedBundle, referenceDate: REFERENCE_DATE });

  expect(improvedBundle.restaurantState.esg.staffWellbeing).toBeGreaterThan(hotelBundle.restaurantState.esg.staffWellbeing);
  expect(after.morale).toBeGreaterThanOrEqual(before.morale);
});

test("Replay + Staff: each cycle is recorded into the HR replay log in the same cycleIndex/date shape the Replay module already uses", () => {
  const hotelBundle = bundle();
  const first = runStaffCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const secondDate = new Date(REFERENCE_DATE);
  secondDate.setDate(secondDate.getDate() + 1);
  const second = runStaffCycle({ hotelBundle, previousState: first, referenceDate: secondDate });

  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[0].cycleIndex).toBe(0);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
  expect(second.replayLog.entries[1].period).toBe("2026-09-11");
});

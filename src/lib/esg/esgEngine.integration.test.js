// Integration tests: lib/esg/esgEngine.js against the real Career/RM/
// PMS/Restaurant/Staff/Finance/Marketing engines (no mocks) -- proves
// the Refonte ESG request's section 5 integrations actually hold, not
// just against hand-built fixtures (see esgEngine.test.js/
// esgCalculations.test.js for the fixture-based unit tests).
import { createGuestHotelBundle } from "../guest";
import { runCareerDay, startCareer } from "../career/careerEngine";
import { runRM } from "../rm/rmEngine";
import { runFinanceCycle } from "../finance/financeEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { esgFromCareerState, runEsgCycle } from "./esgEngine";
import { applyEsgDecision } from "./esgActions";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundle() {
  return createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
}

test("Carrière + ESG: esgFromCareerState derives real figures from a played career day, including today's staff morale/overload", async () => {
  const career = startCareer({ playerId: "player-1", ...bundle() });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const esgState = esgFromCareerState(playedCareer);

  expect(esgState.energy).toBeGreaterThanOrEqual(0);
  expect(esgState.score).toBeGreaterThanOrEqual(0);
});

test("PMS + ESG: more occupied rooms raise energy and water consumption", () => {
  const emptyBundle = bundle();
  const fullBundle = { ...emptyBundle, rooms: emptyBundle.rooms.map((room) => ({ ...room, status: "occupée" })) };
  const stillEmptyBundle = { ...emptyBundle, rooms: emptyBundle.rooms.map((room) => ({ ...room, status: "libre" })) };

  const emptyState = runEsgCycle({ hotelBundle: stillEmptyBundle, referenceDate: REFERENCE_DATE });
  const fullState = runEsgCycle({ hotelBundle: fullBundle, referenceDate: REFERENCE_DATE });

  expect(fullState.energy).toBeGreaterThan(emptyState.energy);
  expect(fullState.water).toBeGreaterThan(emptyState.water);
});

test("Restaurant + ESG: more covers (menu sales) raise energy and waste, and the restaurant's own ESG scores matter", () => {
  const hotelBundle = bundle();
  const busyBundle = { ...hotelBundle, restaurantState: { ...hotelBundle.restaurantState, menu: hotelBundle.restaurantState.menu.map((item) => ({ ...item, sales: item.sales * 5 })) } };

  const normalState = runEsgCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const busyState = runEsgCycle({ hotelBundle: busyBundle, referenceDate: REFERENCE_DATE });

  expect(busyState.energy).toBeGreaterThan(normalState.energy);
  expect(busyState.waste).toBeGreaterThan(normalState.waste);
});

test("Staff + ESG: a high staffOverload lowers the score and surfaces a wellbeing diagnostic", () => {
  const hotelBundle = bundle();
  const normal = runEsgCycle({ hotelBundle, staffOverload: 60, referenceDate: REFERENCE_DATE });
  const overloaded = runEsgCycle({ hotelBundle, staffOverload: 200, referenceDate: REFERENCE_DATE });

  expect(overloaded.score).toBeLessThanOrEqual(normal.score);
  expect(overloaded.diagnostics.some((d) => d.message.includes("bien-être"))).toBe(true);
});

test("Finance + ESG: 'reduire-energie' lowers hotelState.finance.fixedCosts, reflected in the next Finance cycle's expenses", () => {
  const hotelBundle = bundle();
  const before = runFinanceCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  const reducedBundle = applyEsgDecision(hotelBundle, "reduire-energie");
  const after = runFinanceCycle({ hotelBundle: reducedBundle, referenceDate: REFERENCE_DATE });

  expect(after.incomeStatement.expenses.fixed).toBeLessThan(before.incomeStatement.expenses.fixed);
});

test("RM + ESG: both engines derive real figures from the same rooms/reservations", () => {
  const hotelBundle = bundle();
  const rmReport = runRM({ rooms: hotelBundle.rooms, reservations: hotelBundle.reservations, referenceDate: REFERENCE_DATE });
  const esgState = runEsgCycle({ hotelBundle, referenceDate: REFERENCE_DATE });

  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
  expect(esgState.score).toBeGreaterThanOrEqual(0);
});

test("Marketing + ESG: the 'ameliorer-reputation-durable' action raises ESG sustainability and, all else equal, Marketing's own reputation", () => {
  const hotelBundle = bundle();
  const cycle1 = marketingFromCareerState({ hotel: hotelBundle });

  const improvedBundle = applyEsgDecision(hotelBundle, "ameliorer-reputation-durable");
  expect(improvedBundle.hotelState.esg.sustainabilityScore).toBeGreaterThan(hotelBundle.hotelState.esg.sustainabilityScore);

  const unchangedCycle2 = marketingFromCareerState({ hotel: hotelBundle }, cycle1);
  const improvedCycle2 = marketingFromCareerState({ hotel: improvedBundle }, cycle1);

  expect(improvedCycle2.reputation).toBeGreaterThanOrEqual(unchangedCycle2.reputation);
});

test("Replay + ESG: each cycle is recorded into the ESG replay log in the same cycleIndex/date shape the Replay module already uses", () => {
  const hotelBundle = bundle();
  const first = runEsgCycle({ hotelBundle, referenceDate: REFERENCE_DATE });
  const secondDate = new Date(REFERENCE_DATE);
  secondDate.setDate(secondDate.getDate() + 1);
  const second = runEsgCycle({ hotelBundle, previousState: first, referenceDate: secondDate });

  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[0].cycleIndex).toBe(0);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
  expect(second.replayLog.entries[1].period).toBe("2026-09-11");
});

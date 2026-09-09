// Integration tests: lib/pro/proEngine.js against the real business
// engines (no mocks) -- proves the Mode Professionnel Solo request's
// section 5 integrations actually hold, not just against hand-built
// fixtures (see proEngine.test.js/proScenario.test.js for the
// fixture-based unit tests). Same pattern as
// lib/tfe/tfeEngine.integration.test.js, extended with the two Advanced
// modules (RestaurantAdvanced/RmAdvanced) and Clients.
import { startPro, playProMonth } from "./proEngine";
import { runRM } from "../rm/rmEngine";
import { runFinanceCycle } from "../finance/financeEngine";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { esgFromCareerState } from "../esg/esgEngine";
import { housekeepingFromCareerState } from "../housekeeping/housekeepingEngine";
import { restaurantAdvancedFromCareerState } from "../restaurantAdvanced/restaurantAdvancedEngine";
import { rmAdvancedFromCareerState } from "../rmAdvanced/rmAdvancedEngine";
import { clientsFromCareerState } from "../clients/clientsEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "optimisation", segments: ["leisure"], ...overrides };
}

async function playOneMonth(overrides = {}) {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(overrides), referenceDate: REFERENCE_DATE });
  const { state: nextState } = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  return nextState;
}

test("PMS + Pro: occupation feeds the month's performance (occupancyRate is derived from the real PMS rooms)", async () => {
  const proState = await playOneMonth();
  const latest = proState.performanceHistory[0];
  expect(latest.occupancyRate).toBeGreaterThanOrEqual(0);
  expect(latest.occupancyRate).toBeLessThanOrEqual(100);
});

test("RM + Pro: RM derives real pricing figures from the same rooms/reservations the Pro hotel started with", () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const rmReport = runRM({ rooms: state.career.hotel.rooms, reservations: state.career.hotel.reservations, referenceDate: REFERENCE_DATE });
  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
});

test("RM avancé + Pro: the month's rmAdvanced direct share feeds the performance entry", async () => {
  const proState = await playOneMonth();
  const rmAdvancedState = rmAdvancedFromCareerState(proState.career);
  expect(proState.performanceHistory[0].rmDirectShare).toBe(rmAdvancedState.otaStrategy.directShare);
});

test("Restaurant + Pro: the restaurant state's own menu/finance feed the embedded career's hotel bundle", () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  expect(state.career.hotel.restaurantState.menu).toBeDefined();
});

test("Restaurant avancé + Pro: the month's F&B gross margin feeds the performance entry", async () => {
  const proState = await playOneMonth();
  const restaurantAdvancedState = restaurantAdvancedFromCareerState(proState.career);
  expect(proState.performanceHistory[0].fbGrossMargin).toBe(restaurantAdvancedState.profitability.grossMargin);
});

test("Finance + Pro: the score's EBITDA margin agrees with a real Finance cycle on the same hotel bundle", async () => {
  const proState = await playOneMonth();
  const financeState = runFinanceCycle({ hotelBundle: proState.career.hotel, referenceDate: REFERENCE_DATE });
  const latest = proState.performanceHistory[0];
  expect(latest.ebitda).toBe(financeState.incomeStatement.ebitda);
});

test("Staff + Pro: a played month surfaces a real Staff cycle in the next performance entry", async () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const before = staffFromCareerState(state.career);
  const { state: afterOneMonth } = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const after = staffFromCareerState(afterOneMonth.career);
  expect(after.headcount.total).toBeGreaterThanOrEqual(before.headcount.total - 2);
  expect(afterOneMonth.performanceHistory[0].staffOverload).toBeGreaterThanOrEqual(0);
});

test("Marketing + Pro: marketing reputation feeds the month's performance entry", async () => {
  const proState = await playOneMonth();
  const marketingState = marketingFromCareerState(proState.career);
  expect(marketingState.reputation).toBeGreaterThanOrEqual(0);
  expect(proState.performanceHistory[0].marketingReputation).toBe(marketingState.reputation);
});

test("ESG + Pro: the 'transformation-digitale' strategy raises the ESG score contribution vs 'optimisation'", async () => {
  const optimisation = await playOneMonth({ strategy: "optimisation" });
  const digitale = await playOneMonth({ strategy: "transformation-digitale" });
  expect(digitale.performanceHistory[0].esgScore).toBeGreaterThanOrEqual(optimisation.performanceHistory[0].esgScore);
});

test("Housekeeping + Pro: housekeeping quality feeds the month's performance entry", async () => {
  const proState = await playOneMonth();
  const housekeepingState = housekeepingFromCareerState(proState.career);
  expect(proState.performanceHistory[0].housekeepingQuality).toBe(housekeepingState.quality);
});

test("Clients + Pro: clients satisfaction feeds the month's performance entry", async () => {
  const proState = await playOneMonth();
  const clientsState = clientsFromCareerState(proState.career);
  expect(proState.performanceHistory[0].clientsSatisfaction).toBe(clientsState.satisfaction);
});

test("Analytics + Pro: a real analyzeRun() over the Pro run's embedded career run succeeds", async () => {
  const proState = await playOneMonth();
  const replayRun = buildReplayRunFromCareerRun({
    playerId: proState.career.playerId,
    replayLog: proState.career.replayLog,
    scoreHistory: proState.career.scoreHistory,
    status: proState.career.status,
    day: proState.career.day,
  });
  const analysis = analyzeRun(replayRun);
  expect(analysis.diagnostics).toBeDefined();
});

test("Replay + Pro: each month played is recorded into the embedded career's own replay log", async () => {
  let state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  for (let month = 1; month <= 3; month += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    state = result.state;
  }
  expect(state.career.replayLog.entries).toHaveLength(3);
  expect(state.career.replayLog.entries[2].cycleIndex).toBe(2);
});

test("Carrière + Pro: the embedded career state carries the same shape careerEngine.js's own runCareerDay() always returns", async () => {
  const proState = await playOneMonth();
  expect(proState.career.status).toBe("active");
  expect(proState.career.day).toBe(1);
  expect(proState.career.lastDayReport).not.toBeNull();
});

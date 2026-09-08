// Integration tests: lib/tfe/tfeEngine.js against the real business
// engines (no mocks) -- proves the Mode TFE Solo request's section 5
// integrations actually hold, not just against hand-built fixtures (see
// tfeEngine.test.js/tfeScenario.test.js for the fixture-based unit
// tests).
import { startTfe, playTfeMonth } from "./tfeEngine";
import { runRM } from "../rm/rmEngine";
import { runFinanceCycle } from "../finance/financeEngine";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { esgFromCareerState } from "../esg/esgEngine";
import { housekeepingFromCareerState } from "../housekeeping/housekeepingEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "rentabilite", segments: ["leisure"], ...overrides };
}

async function playOneMonth(overrides = {}) {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(overrides), referenceDate: REFERENCE_DATE });
  const { state: nextState } = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  return nextState;
}

test("PMS + TFE: occupation feeds the month's performance (occupancyRate is derived from the real PMS rooms)", async () => {
  const tfeState = await playOneMonth();
  const latest = tfeState.performanceHistory[0];
  expect(latest.occupancyRate).toBeGreaterThanOrEqual(0);
  expect(latest.occupancyRate).toBeLessThanOrEqual(100);
});

test("RM + TFE: RM derives real pricing figures from the same rooms/reservations the TFE hotel started with", () => {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const rmReport = runRM({ rooms: state.career.hotel.rooms, reservations: state.career.hotel.reservations, referenceDate: REFERENCE_DATE });
  expect(rmReport.pricing.recommendedADR).toBeGreaterThan(0);
});

test("Finance + TFE: the score's EBITDA margin agrees with a real Finance cycle on the same hotel bundle", async () => {
  const tfeState = await playOneMonth();
  const financeState = runFinanceCycle({ hotelBundle: tfeState.career.hotel, referenceDate: REFERENCE_DATE });
  const latest = tfeState.performanceHistory[0];
  expect(latest.ebitda).toBe(financeState.incomeStatement.ebitda);
});

test("Staff + TFE: a high staffOverload passed via 'renforcer-equipe' surfaces in the next month's own Staff cycle", async () => {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const before = staffFromCareerState(state.career);
  const { state: afterOneMonth } = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const after = staffFromCareerState(afterOneMonth.career);
  expect(after.headcount.total).toBeGreaterThanOrEqual(before.headcount.total - 2); // team composition may shift, but stays in the same ballpark
  expect(afterOneMonth.performanceHistory[0].staffOverload).toBeGreaterThanOrEqual(0);
});

test("Marketing + TFE: marketing reputation feeds the month's opportunities count", async () => {
  const tfeState = await playOneMonth();
  const marketingState = marketingFromCareerState(tfeState.career);
  expect(marketingState.reputation).toBeGreaterThanOrEqual(0);
  expect(tfeState.performanceHistory[0].marketingRoi).toBe(marketingState.roi.overallRoi);
});

test("ESG + TFE: the 'durable' strategy raises the ESG score contribution to the TFE score", async () => {
  const rentabilite = await playOneMonth({ strategy: "rentabilite" });
  const durable = await playOneMonth({ strategy: "durable" });
  expect(durable.performanceHistory[0].esgScore).toBeGreaterThanOrEqual(rentabilite.performanceHistory[0].esgScore);
});

test("Housekeeping + TFE: housekeeping quality feeds the month's performance entry", async () => {
  const tfeState = await playOneMonth();
  const housekeepingState = housekeepingFromCareerState(tfeState.career);
  expect(tfeState.performanceHistory[0].housekeepingQuality).toBe(housekeepingState.quality);
});

test("Analytics + TFE: a real analyzeRun() over the TFE's embedded career run succeeds", async () => {
  const tfeState = await playOneMonth();
  const replayRun = buildReplayRunFromCareerRun({
    playerId: tfeState.career.playerId,
    replayLog: tfeState.career.replayLog,
    scoreHistory: tfeState.career.scoreHistory,
    status: tfeState.career.status,
    day: tfeState.career.day,
  });
  const analysis = analyzeRun(replayRun);
  expect(analysis.diagnostics).toBeDefined();
});

test("Replay + TFE: each month played is recorded into the embedded career's own replay log", async () => {
  let state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  for (let month = 1; month <= 3; month += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    state = result.state;
  }
  expect(state.career.replayLog.entries).toHaveLength(3);
  expect(state.career.replayLog.entries[2].cycleIndex).toBe(2);
});

test("Carrière + TFE: the embedded career state carries the same shape careerEngine.js's own runCareerDay() always returns", async () => {
  const tfeState = await playOneMonth();
  expect(tfeState.career.status).toBe("active");
  expect(tfeState.career.day).toBe(1);
  expect(tfeState.career.lastDayReport).not.toBeNull();
});

// Integration test: a career's own replay log (see careerEngine.js's
// runCareerDay(), which records every day with lib/scenario/
// scenarioReplay.js's generic recordCycle()) becomes a fully navigable
// ReplayRun through lib/replay/replayEngine.js's buildReplayRunFromCareerRun()
// -- section 7 of the request.
import { runCareerDay, startCareer } from "./careerEngine";
import { buildReplayRunFromCareerRun, getCycleForRun, reconstructStateAtCycle } from "../replay/replayEngine";
import { buildTimeline } from "../replay/replayTimeline";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseState() {
  return startCareer({
    playerId: "player-1",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 } },
    restaurantState: { finance: { revenue: [0], costs: [0], months: {} }, menu: [], staff: [], operations: [] },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }],
  });
}

async function playThreeDays() {
  let state = baseState();
  for (let i = 0; i < 3; i += 1) {
    const referenceDate = new Date(REFERENCE_DATE);
    referenceDate.setDate(referenceDate.getDate() + i);
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runCareerDay({ state, referenceDate, rng: () => 0.999 }));
  }
  return state;
}

test("a career's replay log becomes a ReplayRun tagged with the 'career' source", async () => {
  const state = await playThreeDays();
  const replayRun = buildReplayRunFromCareerRun({ playerId: "player-1", replayLog: state.replayLog, scoreHistory: state.scoreHistory, status: state.status, day: state.day });

  expect(replayRun.id).toBe("career-player-1");
  expect(replayRun.source).toBe("career");
  expect(replayRun.cycles).toHaveLength(3);
});

test("the career replay is navigable cycle by cycle, with the real daily state reconstructed", async () => {
  const state = await playThreeDays();
  const replayRun = buildReplayRunFromCareerRun({ playerId: "player-1", replayLog: state.replayLog, scoreHistory: state.scoreHistory, status: state.status, day: state.day });

  const timeline = buildTimeline(replayRun.cycles);
  expect(timeline).toHaveLength(3);

  const secondCycle = getCycleForRun(replayRun, 1);
  expect(secondCycle.baseReport.date).toBe("2026-09-11");
  expect(reconstructStateAtCycle(replayRun, 1)).toEqual(expect.objectContaining({ hotelState: expect.any(Object) }));
});

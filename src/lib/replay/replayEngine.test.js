import {
  buildReplayRunFromAcademyGroup,
  buildReplayRunFromCompetitionPlayer,
  buildReplayRunFromScenarioRun,
  getCycleForRun,
  goToNextCycle,
  goToPreviousCycle,
  jumpToCycleIndex,
  loadReplayRun,
  reconstructStateAtCycle,
} from "./replayEngine";
import { createReplayState } from "./replayState";
import { initScenarioRun, playScenarioCycle } from "../scenario/scenarioEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

async function playedRunState(mode = "academie", cycles = 2) {
  const scenario = createScenarioTemplate(mode, {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: cycles },
  });
  let run = initScenarioRun({ scenario });
  for (let i = 0; i < cycles; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ runState: run } = await playScenarioCycle({ runState: run, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
  }
  return run;
}

test("buildReplayRunFromAcademyGroup normalizes a group's run with academie-prefixed id", async () => {
  const runState = await playedRunState("academie");
  const replayRun = buildReplayRunFromAcademyGroup({ classId: "c1", id: "g1", name: "Groupe A" }, runState);
  expect(replayRun.id).toBe("academie-c1-g1");
  expect(replayRun.source).toBe("academie");
  expect(replayRun.cycles).toHaveLength(2);
});

test("buildReplayRunFromCompetitionPlayer normalizes a player's run with competition-prefixed id", async () => {
  const runState = await playedRunState("competition");
  const replayRun = buildReplayRunFromCompetitionPlayer({ matchId: "m1", id: "p1", name: "Ada" }, runState);
  expect(replayRun.id).toBe("competition-m1-p1");
  expect(replayRun.source).toBe("competition");
});

test("buildReplayRunFromScenarioRun tags a professionnel-mode run as tfe, everything else as scenario", async () => {
  const soloRun = await playedRunState("solo");
  expect(buildReplayRunFromScenarioRun({ runId: "r1", runState: soloRun }).source).toBe("scenario");

  const tfeRun = await playedRunState("professionnel");
  expect(buildReplayRunFromScenarioRun({ runId: "r2", runState: tfeRun }).source).toBe("tfe");
});

test("loadReplayRun stores the run and resets the cursor to cycle 0", async () => {
  const runState = await playedRunState("academie");
  const replayRun = buildReplayRunFromAcademyGroup({ classId: "c1", id: "g1", name: "Groupe A" }, runState);
  const state = loadReplayRun(createReplayState(), replayRun);

  expect(state.currentRunId).toBe(replayRun.id);
  expect(state.currentCycleIndex).toBe(0);
  expect(state.runsById[replayRun.id]).toBe(replayRun);
});

test("getCycleForRun/reconstructStateAtCycle reads the real state produced by runDailyCycle", async () => {
  const runState = await playedRunState("academie");
  const replayRun = buildReplayRunFromAcademyGroup({ classId: "c1", id: "g1", name: "Groupe A" }, runState);

  const cycle0 = getCycleForRun(replayRun, 0);
  expect(cycle0.cycleIndex).toBe(0);
  expect(reconstructStateAtCycle(replayRun, 0)).toEqual(expect.objectContaining({ hotelState: expect.any(Object), restaurantState: expect.any(Object) }));
});

test("goToNextCycle/goToPreviousCycle/jumpToCycleIndex stay within the run's bounds", async () => {
  const runState = await playedRunState("academie", 3);
  const replayRun = buildReplayRunFromAcademyGroup({ classId: "c1", id: "g1", name: "Groupe A" }, runState);
  let state = loadReplayRun(createReplayState(), replayRun);

  state = goToNextCycle(state);
  expect(state.currentCycleIndex).toBe(1);

  state = goToNextCycle(goToNextCycle(state)); // would overshoot to 3, clamped to 2
  expect(state.currentCycleIndex).toBe(2);

  state = goToPreviousCycle(state);
  expect(state.currentCycleIndex).toBe(1);

  state = jumpToCycleIndex(state, 0);
  expect(state.currentCycleIndex).toBe(0);

  state = jumpToCycleIndex(state, 99);
  expect(state.currentCycleIndex).toBe(2);
});

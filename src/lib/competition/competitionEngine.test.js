import { assignScenarioToMatch, finalizeMatch, finalizePlayer, initScenarioRunForPlayer, runPlayerBatch, runPlayerCycle } from "./competitionEngine";
import { addMatch, createMatch, setMatchScenario } from "./competitionMatch";
import { createPlayer, registerPlayer } from "./competitionPlayers";
import { createCompetitionState } from "./competitionState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario(overrides = {}) {
  return createScenarioTemplate("competition", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
    scoring: { weights: { finance: 1 } },
    ...overrides,
  });
}

function stateWithMatchAndPlayers() {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));
  state = registerPlayer(state, createPlayer({ id: "p2", matchId: "m1", name: "Grace" }));
  return state;
}

function assign(state, scenarioOverrides = {}) {
  const { scenario: sharedScenario, state: nextState } = assignScenarioToMatch(state, "m1", scenario(scenarioOverrides));
  return setMatchScenario(nextState, "m1", sharedScenario);
}

test("assignScenarioToMatch rejects a scenario missing a seed and common scoring", () => {
  expect(() => assignScenarioToMatch(stateWithMatchAndPlayers(), "m1", { mode: "competition" })).toThrow(/invalide/i);
});

test("assignScenarioToMatch stamps a shared seed and seeds one run per registered player", () => {
  const state = assign(stateWithMatchAndPlayers());
  expect(state.runsByPlayerId.p1).toBeDefined();
  expect(state.runsByPlayerId.p2).toBeDefined();
  expect(state.runsByPlayerId.p1).not.toBe(state.runsByPlayerId.p2);
});

test("runPlayerCycle throws when no scenario has been assigned yet", async () => {
  await expect(runPlayerCycle({ state: stateWithMatchAndPlayers(), matchId: "m1", playerId: "p1" })).rejects.toThrow(/aucun scénario/i);
});

test("runPlayerCycle throws for a player with no active run", async () => {
  const state = assign(stateWithMatchAndPlayers());
  await expect(runPlayerCycle({ state, matchId: "m1", playerId: "missing" })).rejects.toThrow(/aucun run/i);
});

test("two players' cycles draw identical random events for the same cycle (the seed is truly shared)", async () => {
  // rng() => 0 fires every candidate event -- if it fires for one player's
  // cycle 0, it must fire for the other's cycle 0 too, in either call order.
  const state = assign(stateWithMatchAndPlayers());
  const { state: afterP2 } = await runPlayerCycle({ state, matchId: "m1", playerId: "p2", referenceDate: REFERENCE_DATE });
  const { report: reportP1 } = await runPlayerCycle({ state: afterP2, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE });
  const reportP2 = (await runPlayerCycle({ state, matchId: "m1", playerId: "p2", referenceDate: REFERENCE_DATE })).report;

  expect(reportP1.baseReport.events.map((e) => e.id).sort()).toEqual(reportP2.baseReport.events.map((e) => e.id).sort());
});

test("initScenarioRunForPlayer seeds a run for a player who joined after assignment", () => {
  let state = assign(stateWithMatchAndPlayers());
  state = registerPlayer(state, createPlayer({ id: "p3", matchId: "m1", name: "Marie" }));
  expect(state.runsByPlayerId.p3).toBeUndefined();

  const match = state.matches[0];
  state = initScenarioRunForPlayer(state, "p3", match.scenario);
  expect(state.runsByPlayerId.p3.status).toBe("running");
});

test("runPlayerBatch plays several cycles for one player without touching the other", async () => {
  const state = assign(stateWithMatchAndPlayers());
  const { reports, state: nextState } = await runPlayerBatch({ state, matchId: "m1", playerId: "p1", cycles: 2, referenceDate: REFERENCE_DATE });

  expect(reports).toHaveLength(2);
  expect(nextState.runsByPlayerId.p1.status).toBe("finished");
  expect(nextState.runsByPlayerId.p2.cycleIndex).toBe(0);
});

test("finalizePlayer grades one player's run and stores the report", async () => {
  let state = assign(stateWithMatchAndPlayers());
  ({ state } = await runPlayerBatch({ state, matchId: "m1", playerId: "p1", cycles: 2, referenceDate: REFERENCE_DATE }));

  const { report, state: nextState } = finalizePlayer(state, "p1");
  expect(report).toEqual(expect.objectContaining({ finalScore: expect.any(Number) }));
  expect(nextState.reportsByPlayerId.p1).toEqual(report);
});

test("finalizeMatch finalizes every player and returns the leaderboard", async () => {
  let state = assign(stateWithMatchAndPlayers());
  ({ state } = await runPlayerBatch({ state, matchId: "m1", playerId: "p1", cycles: 2, referenceDate: REFERENCE_DATE }));
  ({ state } = await runPlayerBatch({ state, matchId: "m1", playerId: "p2", cycles: 2, referenceDate: REFERENCE_DATE }));

  const { ranking, state: finalState } = finalizeMatch(state, "m1");

  expect(ranking).toHaveLength(2);
  expect(ranking[0].rank).toBe(1);
  expect(finalState.reportsByPlayerId.p1).toBeDefined();
  expect(finalState.reportsByPlayerId.p2).toBeDefined();
});

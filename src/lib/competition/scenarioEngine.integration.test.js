// Integration test: competitionEngine really drives lib/scenario/
// scenarioEngine.js end to end for a whole match, with a genuinely shared
// seed and independent sandboxes per player.
import { assignScenarioToMatch, finalizeMatch, finalizePlayer, runPlayerCycle } from "./competitionEngine";
import { addMatch, createMatch, setMatchScenario } from "./competitionMatch";
import { createPlayer, registerPlayer } from "./competitionPlayers";
import { createCompetitionState } from "./competitionState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario() {
  return createScenarioTemplate("competition", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 3 },
    scoring: { weights: { finance: 1 } },
  });
}

function stateWithThreePlayers() {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  ["p1", "p2", "p3"].forEach((id) => {
    state = registerPlayer(state, createPlayer({ id, matchId: "m1", name: id }));
  });
  return state;
}

test("assigning a global scenario seeds one independent sandboxed run per player", () => {
  const { scenario: sharedScenario, state } = assignScenarioToMatch(stateWithThreePlayers(), "m1", scenario());
  expect(sharedScenario.replay.seed).toBeTruthy();
  expect(new Set([state.runsByPlayerId.p1, state.runsByPlayerId.p2, state.runsByPlayerId.p3]).size).toBe(3);
});

test("every player's cycle N sees identical scenario events regardless of play order", async () => {
  let state;
  ({ state } = assignScenarioToMatch(stateWithThreePlayers(), "m1", scenario()));
  state = setMatchScenario(state, "m1", state.runsByPlayerId.p1.scenario);

  // Play in a scrambled order: p3, then p1, then p2.
  const order = ["p3", "p1", "p2"];
  const events = {};
  for (const playerId of order) {
    // eslint-disable-next-line no-await-in-loop
    const { report, state: nextState } = await runPlayerCycle({ state, matchId: "m1", playerId, referenceDate: REFERENCE_DATE });
    events[playerId] = report.baseReport.events.map((e) => e.id).sort();
    state = nextState;
  }

  expect(events.p1).toEqual(events.p2);
  expect(events.p2).toEqual(events.p3);
});

test("a full match: three players play to completion and get an automatic, fair leaderboard", async () => {
  let state;
  ({ state } = assignScenarioToMatch(stateWithThreePlayers(), "m1", scenario()));
  state = setMatchScenario(state, "m1", state.runsByPlayerId.p1.scenario);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (const playerId of ["p1", "p2", "p3"]) {
      // eslint-disable-next-line no-await-in-loop
      ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId, referenceDate: REFERENCE_DATE }));
    }
  }

  expect(["p1", "p2", "p3"].every((playerId) => state.runsByPlayerId[playerId].status === "finished")).toBe(true);

  const { ranking, state: finalState } = finalizeMatch(state, "m1");
  expect(ranking).toHaveLength(3);
  expect(new Set(ranking.map((entry) => entry.rank))).toEqual(new Set([1, 2, 3]));
  ["p1", "p2", "p3"].forEach((playerId) => expect(finalState.reportsByPlayerId[playerId]).toBeDefined());
});

test("a player's decisions never leak into another player's sandboxed state", async () => {
  let state;
  ({ state } = assignScenarioToMatch(stateWithThreePlayers(), "m1", scenario()));
  state = setMatchScenario(state, "m1", state.runsByPlayerId.p1.scenario);

  const beforeP2 = JSON.stringify(state.runsByPlayerId.p2);
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", decisions: { pricingADR: 999 }, referenceDate: REFERENCE_DATE }));

  expect(JSON.stringify(state.runsByPlayerId.p2)).toBe(beforeP2);
});

test("finalizePlayer used directly still produces a report scenarioEvaluation can grade", async () => {
  let state;
  ({ state } = assignScenarioToMatch(stateWithThreePlayers(), "m1", scenario()));
  state = setMatchScenario(state, "m1", state.runsByPlayerId.p1.scenario);
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE }));

  const { report } = finalizePlayer(state, "p1");
  expect(report).toEqual(expect.objectContaining({ finalScore: expect.any(Number), grade: expect.any(String) }));
});

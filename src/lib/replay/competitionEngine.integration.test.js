// Integration test: a finished Competition player's run becomes a
// normalized, navigable replay, and two players' replays can be compared
// against each other -- exactly what useCompetition.js's
// generateFinalRanking() wires up in production.
import { assignScenarioToMatch, finalizeMatch, runPlayerCycle } from "../competition/competitionEngine";
import { addMatch, createMatch, setMatchScenario } from "../competition/competitionMatch";
import { createPlayer, registerPlayer } from "../competition/competitionPlayers";
import { createCompetitionState } from "../competition/competitionState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromCompetitionPlayer, getCycleForRun } from "./replayEngine";
import { compareTimelines, compareScoring } from "./replayComparison";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario() {
  return createScenarioTemplate("competition", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
    scoring: { weights: { finance: 1 } },
  });
}

function stateWithTwoPlayers() {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));
  state = registerPlayer(state, createPlayer({ id: "p2", matchId: "m1", name: "Grace" }));
  const { scenario: sharedScenario, state: assigned } = assignScenarioToMatch(state, "m1", scenario());
  return setMatchScenario(assigned, "m1", sharedScenario);
}

test("a finished player's run becomes a replay carrying the shared seed's real daily reports", async () => {
  let state = stateWithTwoPlayers();
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE }));
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE }));

  const { ranking, state: finalState } = finalizeMatch(state, "m1");
  const player = finalState.players.find((entry) => entry.id === "p1");
  const replayRun = buildReplayRunFromCompetitionPlayer(player, finalState.runsByPlayerId.p1, finalState.reportsByPlayerId.p1);

  expect(replayRun.id).toBe("competition-m1-p1");
  expect(replayRun.source).toBe("competition");
  expect(replayRun.cycles).toHaveLength(2);
  expect(getCycleForRun(replayRun, 1).baseReport.date).toBe("2026-09-10");
  expect(ranking.some((entry) => entry.playerId === "p1")).toBe(true);
});

test("two players' replays reflect the exact same synchronized events on the same cycle", async () => {
  let state = stateWithTwoPlayers();
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p2", referenceDate: REFERENCE_DATE }));
  ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE }));

  const playerA = state.players.find((entry) => entry.id === "p1");
  const playerB = state.players.find((entry) => entry.id === "p2");
  const replayA = buildReplayRunFromCompetitionPlayer(playerA, state.runsByPlayerId.p1);
  const replayB = buildReplayRunFromCompetitionPlayer(playerB, state.runsByPlayerId.p2);

  const rows = compareTimelines(replayA, replayB);
  expect(rows[0].a.events.map((e) => e.id).sort()).toEqual(rows[0].b.events.map((e) => e.id).sort());

  const scoring = compareScoring(replayA, replayB);
  expect(scoring.a.label).toBe("Ada");
  expect(scoring.b.label).toBe("Grace");
});

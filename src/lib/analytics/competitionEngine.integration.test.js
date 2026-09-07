// Integration test: analyticsEngine analyzes real Competition players,
// compares their strategies, and produces the organizer-facing
// competition report -- section 7's requirement.
import { assignScenarioToMatch, finalizeMatch, runPlayerCycle } from "../competition/competitionEngine";
import { addMatch, createMatch, setMatchScenario } from "../competition/competitionMatch";
import { createPlayer, registerPlayer } from "../competition/competitionPlayers";
import { createCompetitionState } from "../competition/competitionState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromCompetitionPlayer } from "../replay/replayEngine";
import { analyzeRun, compareRuns, generateCompetitionReport } from "./analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario() {
  return createScenarioTemplate("competition", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
    scoring: { weights: { finance: 1 } },
  });
}

async function playedMatchState() {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));
  state = registerPlayer(state, createPlayer({ id: "p2", matchId: "m1", name: "Grace" }));
  const { scenario: sharedScenario, state: assigned } = assignScenarioToMatch(state, "m1", scenario());
  state = setMatchScenario(assigned, "m1", sharedScenario);

  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p1", referenceDate: REFERENCE_DATE }));
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runPlayerCycle({ state, matchId: "m1", playerId: "p2", referenceDate: REFERENCE_DATE }));
  }
  return state;
}

test("analyzeRun analyzes a real Competition player's finished run", async () => {
  const state = await playedMatchState();
  const { ranking, state: finalState } = finalizeMatch(state, "m1");
  const player = finalState.players.find((entry) => entry.id === "p1");
  const replayRun = buildReplayRunFromCompetitionPlayer(player, finalState.runsByPlayerId.p1, finalState.reportsByPlayerId.p1);

  const analysis = analyzeRun(replayRun);
  expect(analysis.runId).toBe("competition-m1-p1");
  expect(ranking.some((entry) => entry.playerId === "p1")).toBe(true);
});

test("compareRuns compares two players' real strategies under the same shared seed", async () => {
  const state = await playedMatchState();
  const playerA = state.players.find((entry) => entry.id === "p1");
  const playerB = state.players.find((entry) => entry.id === "p2");
  const analysisA = analyzeRun(buildReplayRunFromCompetitionPlayer(playerA, state.runsByPlayerId.p1));
  const analysisB = analyzeRun(buildReplayRunFromCompetitionPlayer(playerB, state.runsByPlayerId.p2));

  const comparison = compareRuns(analysisA, analysisB);
  expect(comparison.runA.label).toBe("Ada");
  expect(comparison.runB.label).toBe("Grace");
});

test("generateCompetitionReport ranks the whole field for the organizer", async () => {
  const state = await playedMatchState();
  const playerA = state.players.find((entry) => entry.id === "p1");
  const playerB = state.players.find((entry) => entry.id === "p2");
  const analyses = [
    analyzeRun(buildReplayRunFromCompetitionPlayer(playerA, state.runsByPlayerId.p1)),
    analyzeRun(buildReplayRunFromCompetitionPlayer(playerB, state.runsByPlayerId.p2)),
  ];

  const report = generateCompetitionReport(analyses);
  expect(report.playerCount).toBe(2);
  expect(report.ranking).toHaveLength(2);
});

import { objectiveBreakdown, rankPlayers } from "./competitionRanking";

function player(id, name) {
  return { id, name };
}

test("rankPlayers sorts by current score, highest first", () => {
  const players = [player("p1", "Ada"), player("p2", "Grace")];
  const runsByPlayerId = { p1: { status: "running", scoreHistory: [40] }, p2: { status: "running", scoreHistory: [90] } };

  const ranking = rankPlayers(players, runsByPlayerId);
  expect(ranking.map((entry) => entry.playerId)).toEqual(["p2", "p1"]);
  expect(ranking[0].rank).toBe(1);
});

test("rankPlayers puts a not-yet-started player last", () => {
  const players = [player("p1", "Ada"), player("p2", "Grace")];
  const runsByPlayerId = { p1: { status: "running", scoreHistory: [40] } };

  const ranking = rankPlayers(players, runsByPlayerId);
  expect(ranking.map((entry) => entry.playerId)).toEqual(["p1", "p2"]);
  expect(ranking[1].status).toBe("not_started");
});

test("objectiveBreakdown counts how many players achieved each objective", () => {
  const players = [player("p1", "Ada"), player("p2", "Grace")];
  const runsByPlayerId = {
    p1: { objectivesStatus: { objectives: [{ id: "profit", achieved: true }] } },
    p2: { objectivesStatus: { objectives: [{ id: "profit", achieved: false }] } },
  };

  const breakdown = objectiveBreakdown(players, runsByPlayerId);
  expect(breakdown).toEqual([expect.objectContaining({ objectiveId: "profit", achievedCount: 1, totalPlayers: 2 })]);
});

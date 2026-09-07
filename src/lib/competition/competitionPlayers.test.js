import { createPlayer, listPlayersForMatch, registerPlayer, removePlayer } from "./competitionPlayers";
import { createCompetitionState } from "./competitionState";

test("createPlayer fills in sensible defaults", () => {
  const player = createPlayer({ id: "p1", matchId: "m1", name: "Ada" });
  expect(player).toEqual(expect.objectContaining({ id: "p1", matchId: "m1", name: "Ada" }));
});

test("registerPlayer/listPlayersForMatch only returns players for that match", () => {
  let state = createCompetitionState();
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));
  state = registerPlayer(state, createPlayer({ id: "p2", matchId: "m2", name: "Grace" }));

  expect(listPlayersForMatch(state, "m1").map((p) => p.id)).toEqual(["p1"]);
});

test("removePlayer also drops that player's run and report", () => {
  let state = createCompetitionState({ runsByPlayerId: { p1: { status: "running" } }, reportsByPlayerId: { p1: { grade: "B" } } });
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));

  state = removePlayer(state, "p1");

  expect(state.players).toEqual([]);
  expect(state.runsByPlayerId.p1).toBeUndefined();
  expect(state.reportsByPlayerId.p1).toBeUndefined();
});

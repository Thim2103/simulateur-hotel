import { addMatch, createMatch, listMatches, matchSummary, removeMatch, setMatchScenario } from "./competitionMatch";
import { createPlayer, registerPlayer } from "./competitionPlayers";
import { createCompetitionState } from "./competitionState";

test("createMatch fills in sensible defaults", () => {
  const match = createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" });
  expect(match).toEqual(expect.objectContaining({ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null }));
});

test("addMatch/listMatches/removeMatch manage the roster", () => {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  expect(listMatches(state)).toHaveLength(1);

  state = removeMatch(state, "m1");
  expect(listMatches(state)).toHaveLength(0);
});

test("removeMatch also drops that match's players", () => {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "Saison 1", organizerId: "u1" }));
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));

  state = removeMatch(state, "m1");

  expect(state.players).toEqual([]);
});

test("setMatchScenario records the scenario on the right match only", () => {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "A", organizerId: "u1" }));
  state = addMatch(state, createMatch({ id: "m2", name: "B", organizerId: "u1" }));

  state = setMatchScenario(state, "m1", { id: "s1" });

  expect(state.matches.find((m) => m.id === "m1").scenario).toEqual({ id: "s1" });
  expect(state.matches.find((m) => m.id === "m2").scenario).toBeNull();
});

test("matchSummary reports the player count", () => {
  let state = createCompetitionState();
  state = addMatch(state, createMatch({ id: "m1", name: "A", organizerId: "u1" }));
  state = registerPlayer(state, createPlayer({ id: "p1", matchId: "m1", name: "Ada" }));

  expect(matchSummary(state, "m1")).toEqual(expect.objectContaining({ playerCount: 1 }));
});

test("matchSummary returns null for an unknown match", () => {
  expect(matchSummary(createCompetitionState(), "missing")).toBeNull();
});

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CompetitionMatch from "./CompetitionMatch";
import { useCompetitionContext } from "../context/CompetitionContext";

jest.mock("../context/CompetitionContext");

function renderAtMatch(matchId = "m1") {
  return render(
    <MemoryRouter initialEntries={[`/competition/${matchId}`]}>
      <Routes>
        <Route path="/competition/:matchId" element={<CompetitionMatch />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseHook(overrides = {}) {
  return {
    competitionState: { matches: [{ id: "m1", name: "Saison 1", scenario: null }], players: [], runsByPlayerId: {}, reportsByPlayerId: {} },
    isRunning: false,
    error: null,
    loadCompetitionState: jest.fn().mockResolvedValue(undefined),
    registerPlayer: jest.fn().mockResolvedValue({ id: "p1" }),
    assignScenario: jest.fn().mockResolvedValue({ id: "s1" }),
    ...overrides,
  };
}

test("loads the match bundle for the routed matchId", () => {
  const loadCompetitionState = jest.fn().mockResolvedValue(undefined);
  useCompetitionContext.mockReturnValue(baseHook({ loadCompetitionState }));
  renderAtMatch("m1");
  expect(loadCompetitionState).toHaveBeenCalledWith("m1");
});

test("shows the match name and prompts to register a player before assigning a scenario", () => {
  useCompetitionContext.mockReturnValue(baseHook());
  renderAtMatch();
  expect(screen.getByText("Saison 1")).toBeInTheDocument();
  expect(screen.getByText(/inscrivez au moins un joueur/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /lancer la compétition/i })).toBeDisabled();
});

test("registering a player calls registerPlayer with the match id and typed name", () => {
  const registerPlayer = jest.fn().mockResolvedValue({ id: "p1" });
  useCompetitionContext.mockReturnValue(baseHook({ registerPlayer }));
  renderAtMatch();

  fireEvent.change(screen.getByPlaceholderText(/joueur 1/i), { target: { value: "Ada" } });
  fireEvent.click(screen.getByRole("button", { name: /inscrire/i }));

  expect(registerPlayer).toHaveBeenCalledWith("m1", "Ada");
});

test("assigning the scenario calls assignScenario once a player exists", () => {
  const assignScenario = jest.fn().mockResolvedValue({ id: "s1" });
  useCompetitionContext.mockReturnValue(
    baseHook({ assignScenario, competitionState: { matches: [{ id: "m1", name: "Saison 1", scenario: null }], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: {}, reportsByPlayerId: {} } })
  );
  renderAtMatch();

  fireEvent.click(screen.getByRole("button", { name: /lancer la compétition/i }));
  expect(assignScenario).toHaveBeenCalledWith("m1", expect.objectContaining({ title: expect.any(String) }));
});

test("shows the shared seed once a scenario is assigned", () => {
  useCompetitionContext.mockReturnValue(
    baseHook({ competitionState: { matches: [{ id: "m1", name: "Saison 1", scenario: { title: "Saison — 30 jours", replay: { seed: "match-m1" } } }], players: [], runsByPlayerId: {}, reportsByPlayerId: {} } })
  );
  renderAtMatch();
  expect(screen.getByText(/match-m1/)).toBeInTheDocument();
});

test("shows the player table with a link into each player", () => {
  useCompetitionContext.mockReturnValue(
    baseHook({
      competitionState: {
        matches: [{ id: "m1", name: "Saison 1", scenario: null }],
        players: [{ id: "p1", matchId: "m1", name: "Ada" }],
        runsByPlayerId: { p1: { status: "running", scoreHistory: [60] } },
        reportsByPlayerId: {},
      },
    })
  );
  renderAtMatch();

  expect(screen.getByText("Ada")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ouvrir/i })).toHaveAttribute("href", "/competition/m1/player/p1");
  expect(screen.getByText(/score 60/i)).toBeInTheDocument();
});

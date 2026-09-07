import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CompetitionReview from "./CompetitionReview";
import { useCompetitionContext } from "../context/CompetitionContext";
import { createReplayLog, recordCycle } from "../lib/scenario/scenarioReplay";

jest.mock("../context/CompetitionContext");

function renderAtReview() {
  return render(
    <MemoryRouter initialEntries={["/competition/m1/review"]}>
      <Routes>
        <Route path="/competition/:matchId/review" element={<CompetitionReview />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseHook(overrides = {}) {
  return {
    competitionState: { matches: [{ id: "m1", name: "Saison 1", scenario: null }], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: {}, reportsByPlayerId: {} },
    isRunning: false,
    error: null,
    loadCompetitionState: jest.fn().mockResolvedValue(undefined),
    generateFinalRanking: jest.fn(),
    ...overrides,
  };
}

function ranking() {
  return [{ rank: 1, playerId: "p1", playerName: "Ada", currentScore: 70 }];
}

test("prompts to generate the final ranking before one exists", () => {
  useCompetitionContext.mockReturnValue(baseHook());
  renderAtReview();
  expect(screen.getByText(/cliquez sur « générer le classement final »/i)).toBeInTheDocument();
});

test("clicking generate calls generateFinalRanking and renders the podium", async () => {
  const generateFinalRanking = jest.fn().mockResolvedValue(ranking());
  useCompetitionContext.mockReturnValue(baseHook({ generateFinalRanking }));
  renderAtReview();

  fireEvent.click(screen.getByRole("button", { name: /générer le classement final/i }));

  expect(generateFinalRanking).toHaveBeenCalledWith("m1");
  expect(await screen.findByText("Podium")).toBeInTheDocument();
  expect((await screen.findAllByText("70")).length).toBeGreaterThan(0);
});

test("shows the grade for each player once reports are available", async () => {
  const generateFinalRanking = jest.fn().mockResolvedValue(ranking());
  useCompetitionContext.mockReturnValue(
    baseHook({
      generateFinalRanking,
      competitionState: {
        matches: [{ id: "m1", name: "Saison 1", scenario: null }],
        players: [{ id: "p1", matchId: "m1", name: "Ada" }],
        runsByPlayerId: {},
        reportsByPlayerId: { p1: { finalScore: 70, grade: "B", gradeLabel: "Bien", passed: true, recommendations: [] } },
      },
    })
  );
  renderAtReview();

  fireEvent.click(screen.getByRole("button", { name: /générer le classement final/i }));
  expect(await screen.findByText(/B · Bien/)).toBeInTheDocument();
});

test("shows the replay for the selected player's recorded cycles", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0, score: 42, baseReport: { date: "2026-09-10" }, scenarioEvents: [] });
  useCompetitionContext.mockReturnValue(
    baseHook({ competitionState: { matches: [{ id: "m1", name: "Saison 1", scenario: null }], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: { p1: { replayLog: log } }, reportsByPlayerId: {} } })
  );
  renderAtReview();

  expect(screen.getByText(/cycle 1 · 2026-09-10/i)).toBeInTheDocument();
  expect(screen.getByText(/score : 42/i)).toBeInTheDocument();
});

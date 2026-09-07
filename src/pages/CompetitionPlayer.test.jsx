import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CompetitionPlayer from "./CompetitionPlayer";
import { useCompetitionContext } from "../context/CompetitionContext";
import { createReplayLog, recordCycle } from "../lib/scenario/scenarioReplay";

jest.mock("../context/CompetitionContext");

function renderAtPlayer() {
  return render(
    <MemoryRouter initialEntries={["/competition/m1/player/p1"]}>
      <Routes>
        <Route path="/competition/:matchId/player/:playerId" element={<CompetitionPlayer />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseHook(overrides = {}) {
  return {
    competitionState: { matches: [], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: {}, reportsByPlayerId: {} },
    isRunning: false,
    error: null,
    loadCompetitionState: jest.fn().mockResolvedValue(undefined),
    runCompetitionCycle: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("shows a not-started message when the player has no run yet", () => {
  useCompetitionContext.mockReturnValue(baseHook());
  renderAtPlayer();
  expect(screen.getByText(/aucun scénario n'a encore été assigné/i)).toBeInTheDocument();
});

test("shows objectives and daily reports once a run exists", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0, score: 55, baseReport: { date: "2026-09-10" }, scenarioEvents: [] });
  const run = {
    status: "running",
    cycleIndex: 1,
    totalCycles: 30,
    scoreHistory: [55],
    objectivesStatus: { objectives: [{ id: "profit", label: "Profit total le plus élevé", current: 1200, target: 0, achieved: true }] },
    replayLog: log,
  };
  useCompetitionContext.mockReturnValue(baseHook({ competitionState: { matches: [], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: { p1: run }, reportsByPlayerId: {} } }));
  renderAtPlayer();

  expect(screen.getByText("Profit total le plus élevé")).toBeInTheDocument();
  expect(screen.getByText("Atteint")).toBeInTheDocument();
  expect(screen.getByText(/cycle 1 · 2026-09-10/i)).toBeInTheDocument();
});

test("clicking 'Jouer un cycle' calls runCompetitionCycle with the routed ids", () => {
  const runCompetitionCycle = jest.fn().mockResolvedValue({});
  const run = { status: "running", cycleIndex: 0, totalCycles: 30, scoreHistory: [], objectivesStatus: { objectives: [] }, replayLog: createReplayLog() };
  useCompetitionContext.mockReturnValue(baseHook({ runCompetitionCycle, competitionState: { matches: [], players: [{ id: "p1", matchId: "m1", name: "Ada" }], runsByPlayerId: { p1: run }, reportsByPlayerId: {} } }));
  renderAtPlayer();

  fireEvent.click(screen.getByRole("button", { name: /jouer un cycle/i }));
  expect(runCompetitionCycle).toHaveBeenCalledWith("m1", "p1", {});
});

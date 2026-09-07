import { renderHook, act } from "@testing-library/react";
import { useCompetition } from "./useCompetition";
import competitionRepository from "../lib/competition/competitionRepository";
import { createScenarioTemplate } from "../lib/scenario/scenarioSchema";

jest.mock("../lib/competition/competitionRepository", () => ({
  createMatch: jest.fn(),
  registerPlayer: jest.fn(),
  saveMatchScenario: jest.fn(),
  savePlayerRun: jest.fn(),
  loadMatchBundle: jest.fn(),
  loadPlayerRun: jest.fn(),
  savePlayerReport: jest.fn(),
  saveRanking: jest.fn(),
  listMatches: jest.fn(),
}));

function scenario(overrides = {}) {
  return createScenarioTemplate("competition", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 1 },
    scoring: { weights: { finance: 1 } },
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  competitionRepository.saveMatchScenario.mockResolvedValue({});
  competitionRepository.savePlayerRun.mockResolvedValue({});
  competitionRepository.savePlayerReport.mockResolvedValue({});
  competitionRepository.saveRanking.mockResolvedValue({});
});

test("createCompetition persists then stores the match locally", async () => {
  competitionRepository.createMatch.mockResolvedValue({ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null, createdAt: "2026-09-07T00:00:00Z" });
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.createCompetition("Saison 1");
  });

  expect(result.current.competitionState.matches).toEqual([expect.objectContaining({ id: "m1", name: "Saison 1" })]);
  expect(result.current.error).toBeNull();
});

test("registerPlayer persists then stores the player locally", async () => {
  competitionRepository.registerPlayer.mockResolvedValue({ id: "p1", matchId: "m1", name: "Ada" });
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.registerPlayer("m1", "Ada");
  });

  expect(result.current.competitionState.players).toEqual([expect.objectContaining({ id: "p1", matchId: "m1" })]);
});

test("assignScenario stamps a shared seed, seeds one run per registered player and persists each one", async () => {
  competitionRepository.createMatch.mockResolvedValue({ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null, createdAt: "2026-09-07T00:00:00Z" });
  competitionRepository.registerPlayer
    .mockResolvedValueOnce({ id: "p1", matchId: "m1", name: "Ada" })
    .mockResolvedValueOnce({ id: "p2", matchId: "m1", name: "Grace" });
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.createCompetition("Saison 1");
  });
  await act(async () => {
    await result.current.registerPlayer("m1", "Ada");
  });
  await act(async () => {
    await result.current.registerPlayer("m1", "Grace");
  });
  await act(async () => {
    await result.current.assignScenario("m1", scenario({ id: "s1" }));
  });

  expect(result.current.competitionState.runsByPlayerId.p1).toEqual(expect.objectContaining({ status: "running" }));
  expect(result.current.competitionState.runsByPlayerId.p2).toEqual(expect.objectContaining({ status: "running" }));
  expect(competitionRepository.savePlayerRun).toHaveBeenCalledTimes(2);
  expect(competitionRepository.saveMatchScenario).toHaveBeenCalledWith(expect.objectContaining({ matchId: "m1" }));
});

test("runCompetitionCycle plays a seeded cycle and persists the resulting run", async () => {
  competitionRepository.createMatch.mockResolvedValue({ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null, createdAt: "2026-09-07T00:00:00Z" });
  competitionRepository.registerPlayer.mockResolvedValue({ id: "p1", matchId: "m1", name: "Ada" });
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.createCompetition("Saison 1");
  });
  await act(async () => {
    await result.current.registerPlayer("m1", "Ada");
  });
  await act(async () => {
    await result.current.assignScenario("m1", scenario({ id: "s1" }));
  });

  let report;
  await act(async () => {
    report = await result.current.runCompetitionCycle("m1", "p1", {});
  });

  expect(report.baseReport).toBeDefined();
  expect(result.current.competitionState.runsByPlayerId.p1.cycleIndex).toBe(1);
  expect(competitionRepository.savePlayerRun).toHaveBeenCalledTimes(2); // assignScenario + runCompetitionCycle
});

test("generateFinalRanking finalizes players and persists the ranking", async () => {
  competitionRepository.createMatch.mockResolvedValue({ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null, createdAt: "2026-09-07T00:00:00Z" });
  competitionRepository.registerPlayer.mockResolvedValue({ id: "p1", matchId: "m1", name: "Ada" });
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.createCompetition("Saison 1");
  });
  await act(async () => {
    await result.current.registerPlayer("m1", "Ada");
  });
  await act(async () => {
    await result.current.assignScenario("m1", scenario({ id: "s1" }));
  });
  await act(async () => {
    await result.current.runCompetitionCycle("m1", "p1", {});
  });

  let ranking;
  await act(async () => {
    ranking = await result.current.generateFinalRanking("m1");
  });

  expect(ranking).toEqual([expect.objectContaining({ playerId: "p1", rank: 1 })]);
  expect(competitionRepository.savePlayerReport).toHaveBeenCalledWith(expect.objectContaining({ matchId: "m1", playerId: "p1" }));
  expect(competitionRepository.saveRanking).toHaveBeenCalledWith(expect.objectContaining({ matchId: "m1" }));
});

test("loadCompetitionState() with no matchId refreshes the organizer's whole match list", async () => {
  competitionRepository.listMatches.mockResolvedValue([{ id: "m1", name: "Saison 1", organizerId: "u1", scenario: null, createdAt: "2026-09-07T00:00:00Z" }]);
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await result.current.loadCompetitionState();
  });

  expect(result.current.competitionState.matches).toEqual([expect.objectContaining({ id: "m1" })]);
});

test("surfaces an error instead of silently failing", async () => {
  competitionRepository.createMatch.mockRejectedValue(new Error("Supabase indisponible"));
  const { result } = renderHook(() => useCompetition());

  await act(async () => {
    await expect(result.current.createCompetition("Saison 1")).rejects.toThrow("Supabase indisponible");
  });

  expect(result.current.error).toEqual(expect.any(Error));
});

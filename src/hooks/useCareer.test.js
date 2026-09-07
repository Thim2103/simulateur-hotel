import { renderHook, act } from "@testing-library/react";
import { useCareer } from "./useCareer";
import careerRepository from "../lib/career/careerRepository";
import { getHotelState } from "../lib/hotelRepository";
import { getRestaurantState } from "../lib/restaurantRepository";
import { listRooms, listReservations } from "../lib/pmsRepository";

jest.mock("../lib/career/careerRepository", () => ({
  saveCareerState: jest.fn(),
  loadCareerState: jest.fn(),
}));
jest.mock("../lib/hotelRepository", () => ({ getHotelState: jest.fn() }));
jest.mock("../lib/restaurantRepository", () => ({ getRestaurantState: jest.fn() }));
jest.mock("../lib/pmsRepository", () => ({ listRooms: jest.fn(), listReservations: jest.fn() }));

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function hotelFixture() {
  return { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 } };
}

function restaurantFixture() {
  return { finance: { revenue: [0], costs: [0], months: {} }, menu: [], staff: [], operations: [] };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(REFERENCE_DATE);
  careerRepository.saveCareerState.mockResolvedValue(undefined);
  getHotelState.mockResolvedValue(hotelFixture());
  getRestaurantState.mockResolvedValue(restaurantFixture());
  listRooms.mockResolvedValue([{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }]);
  listReservations.mockResolvedValue([{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }]);
});

afterEach(() => {
  jest.useRealTimers();
});

test("startCareer loads the player's real hotel and persists the new career", async () => {
  const { result } = renderHook(() => useCareer());

  await act(async () => {
    await result.current.startCareer("player-1");
  });

  expect(result.current.careerState.status).toBe("active");
  expect(result.current.careerState.playerId).toBe("player-1");
  expect(careerRepository.saveCareerState).toHaveBeenCalled();
});

test("loadCareerState reads back a persisted career", async () => {
  careerRepository.loadCareerState.mockResolvedValue({ playerId: "player-1", status: "active", day: 2 });
  const { result } = renderHook(() => useCareer());

  await act(async () => {
    await result.current.loadCareerState();
  });

  expect(result.current.careerState).toEqual({ playerId: "player-1", status: "active", day: 2 });
});

test("acceptMission moves a mission to accepted and persists it", async () => {
  const { result } = renderHook(() => useCareer());
  await act(async () => {
    await result.current.startCareer("player-1");
  });

  await act(async () => {
    await result.current.acceptMission("occupancy-80");
  });

  expect(result.current.careerState.missions.find((m) => m.id === "occupancy-80").status).toBe("accepted");
});

test("nextDay plays a sandboxed day and attaches an analysis for the dashboard", async () => {
  const { result } = renderHook(() => useCareer());
  await act(async () => {
    await result.current.startCareer("player-1");
  });

  let outcome;
  await act(async () => {
    outcome = await result.current.nextDay();
  });

  expect(result.current.careerState.day).toBe(1);
  expect(outcome.analysis.kpis).toBeDefined();
  expect(result.current.careerState.lastAnalysis).toBe(outcome.analysis);
});

test("triggerStoryEvent applies the choice and returns its consequence", async () => {
  const { result } = renderHook(() => useCareer());
  await act(async () => {
    await result.current.startCareer("player-1");
  });

  let consequence;
  await act(async () => {
    consequence = await result.current.triggerStoryEvent("staff-conflict", "mediate");
  });

  expect(consequence).toEqual({ skillId: "leadership", skillPoints: 2 });
  expect(result.current.careerState.skills.leadership.points).toBe(2);
});

test("claimReward removes the reward from the inbox", async () => {
  const { result } = renderHook(() => useCareer());
  await act(async () => {
    await result.current.startCareer("player-1");
  });
  await act(async () => {
    await result.current.acceptMission("mini-scenario-pricing");
  });
  await act(async () => {
    await result.current.completeMission("mini-scenario-pricing");
  });

  const rewardId = result.current.careerState.rewardsInbox[0].id;
  await act(async () => {
    await result.current.claimReward(rewardId);
  });

  expect(result.current.careerState.rewardsInbox).toEqual([]);
});

test("surfaces an error instead of silently failing", async () => {
  getHotelState.mockRejectedValue(new Error("Supabase indisponible"));
  const { result } = renderHook(() => useCareer());

  await act(async () => {
    await expect(result.current.startCareer("player-1")).rejects.toThrow("Supabase indisponible");
  });

  expect(result.current.error).toEqual(expect.any(Error));
});

import { renderHook, act } from "@testing-library/react";
import { useCareer } from "./useCareer";
import careerRepository from "../lib/career/careerRepository";
import { getHotelState } from "../lib/hotelRepository";
import { getRestaurantState } from "../lib/restaurantRepository";
import { listRooms, listReservations } from "../lib/pmsRepository";
import { useSupabaseSession } from "./useSupabaseSession";

jest.mock("../lib/career/careerRepository", () => ({
  saveCareerState: jest.fn(),
  loadCareerState: jest.fn(),
}));
jest.mock("../lib/hotelRepository", () => ({ getHotelState: jest.fn() }));
jest.mock("../lib/restaurantRepository", () => ({ getRestaurantState: jest.fn() }));
jest.mock("../lib/pmsRepository", () => ({ listRooms: jest.fn(), listReservations: jest.fn() }));
jest.mock("./useSupabaseSession");

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function hotelFixture() {
  return { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 } };
}

function restaurantFixture() {
  return { finance: { revenue: [0], costs: [0], months: {} }, menu: [], staff: [], operations: [] };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.useFakeTimers().setSystemTime(REFERENCE_DATE);
  careerRepository.saveCareerState.mockResolvedValue(undefined);
  getHotelState.mockResolvedValue(hotelFixture());
  getRestaurantState.mockResolvedValue(restaurantFixture());
  listRooms.mockResolvedValue([{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }]);
  listReservations.mockResolvedValue([{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }]);
  // Every existing test below exercises the real-Supabase-session path
  // (unchanged behaviour); see the "guest mode" describe block for the
  // localStorage-backed path. `reload` stands in for useSupabaseSession's
  // resolveSession() -- every action now awaits it instead of trusting a
  // closed-over `isGuest` (see useCareer.js's docstring on the mount-time
  // race that guards against).
  const supabaseSession = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session: supabaseSession, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(supabaseSession) });
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

test("applyHotelAdjustment applies a pure transform to the hotel bundle and persists it", async () => {
  const { result } = renderHook(() => useCareer());
  await act(async () => {
    await result.current.startCareer("player-1");
  });

  await act(async () => {
    await result.current.applyHotelAdjustment((hotel) => ({ ...hotel, reservations: hotel.reservations.map((r) => ({ ...r, price: 999 })) }));
  });

  expect(result.current.careerState.hotel.reservations.every((r) => r.price === 999)).toBe(true);
  expect(careerRepository.saveCareerState).toHaveBeenCalled();
});

test("surfaces an error instead of silently failing", async () => {
  getHotelState.mockRejectedValue(new Error("Supabase indisponible"));
  const { result } = renderHook(() => useCareer());

  await act(async () => {
    await expect(result.current.startCareer("player-1")).rejects.toThrow("Supabase indisponible");
  });

  expect(result.current.error).toEqual(expect.any(Error));
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("startCareer seeds a ready-to-play hotel locally, bypassing every Supabase repository", async () => {
    const { result } = renderHook(() => useCareer());

    await act(async () => {
      await result.current.startCareer("player-1");
    });

    expect(getHotelState).not.toHaveBeenCalled();
    expect(getRestaurantState).not.toHaveBeenCalled();
    expect(listRooms).not.toHaveBeenCalled();
    expect(listReservations).not.toHaveBeenCalled();
    expect(careerRepository.saveCareerState).not.toHaveBeenCalled();
    expect(result.current.careerState.status).toBe("active");
    expect(result.current.careerState.hotel.rooms.length).toBeGreaterThan(0);
    expect(result.current.isGuest).toBe(true);
  });

  test("loadCareerState reads the career back from localStorage instead of Supabase", async () => {
    const started = renderHook(() => useCareer());
    await act(async () => {
      await started.result.current.startCareer("player-1");
    });

    const reloaded = renderHook(() => useCareer());
    await act(async () => {
      await reloaded.result.current.loadCareerState();
    });

    expect(careerRepository.loadCareerState).not.toHaveBeenCalled();
    expect(reloaded.result.current.careerState.playerId).toBe("player-1");
  });

  test("nextDay still runs runDailyCycle sandboxed and persists to localStorage, not Supabase", async () => {
    const { result } = renderHook(() => useCareer());
    await act(async () => {
      await result.current.startCareer("player-1");
    });

    let outcome;
    await act(async () => {
      outcome = await result.current.nextDay();
    });

    expect(careerRepository.saveCareerState).not.toHaveBeenCalled();
    expect(result.current.careerState.day).toBe(1);
    expect(outcome.analysis.kpis).toBeDefined();
  });

  // Regression test: on a fresh mount, useSupabaseSession() hasn't
  // resolved yet (loading: true, session: null) -- the guest fallback
  // only becomes available a tick later. Calling loadCareerState()
  // immediately (as CareerDashboard.jsx's mount effect does) must not
  // read that still-unresolved state and wrongly hit
  // careerRepository.loadCareerState() (which would throw "Session
  // Supabase non authentifiee").
  test("an action called before the session finishes resolving still waits for the guest fallback instead of hitting Supabase", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useCareer());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadCareerState();
    });

    // The session resolves to guest only after loadCareerState() has
    // already started -- exactly the race that used to surface a
    // Supabase error.
    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(careerRepository.loadCareerState).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });
});

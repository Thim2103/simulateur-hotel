import { renderHook, act } from "@testing-library/react";
import { useDashboard } from "./useDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import dashboardRepository from "../lib/dashboard/dashboardRepository";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/dashboard/dashboardRepository", () => ({
  saveDashboardPreferences: jest.fn(),
  loadDashboardPreferences: jest.fn(),
}));

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function careerFixture(overrides = {}) {
  return {
    playerId: "player-1",
    status: "active",
    day: 1,
    hotel: {
      hotelState: { marketing: { budget: 1000 } },
      restaurantState: { staff: [{ id: 1, satisfaction: 60 }], operations: [] },
      rooms: [{ id: 1 }],
      reservations: [{ id: 1, room_id: 1, price: 100 }],
    },
    missions: [],
    objectives: [],
    storyline: { currentEventId: null, history: [] },
    skills: {},
    rewardsInbox: [],
    replayLog: { entries: [] },
    scoreHistory: [],
    lastDayReport: {
      date: "2026-09-10",
      profit: 200,
      hotelRevenue: { occupiedRooms: 1, roomRevenue: 100, netRevenue: 100 },
      restaurantRevenue: { netRevenue: 50 },
      restaurantReport: { customerSatisfaction: 4, staff: { headcount: 1, satisfactionAvg: 60 } },
      rmReport: { pricing: { recommendedADR: 110 } },
      progressionReport: { reputation: 70 },
    },
    lastAnalysis: null,
    ...overrides,
  };
}

function careerContextFixture(overrides = {}) {
  return {
    careerState: careerFixture(),
    isRunning: false,
    error: null,
    isGuest: false,
    loadCareerState: jest.fn(),
    applyHotelAdjustment: jest.fn(async (updater) => {
      const state = careerFixture();
      const nextHotel = updater(state.hotel);
      return { ...state, hotel: nextHotel };
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.useFakeTimers().setSystemTime(REFERENCE_DATE);
  dashboardRepository.loadDashboardPreferences.mockResolvedValue(null);
  dashboardRepository.saveDashboardPreferences.mockResolvedValue(undefined);
  // `reload` stands in for resolveSession() -- see useCareer.js's
  // docstring on why every action awaits it now.
  const supabaseSession = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session: supabaseSession, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(supabaseSession) });
  useCareerContext.mockReturnValue(careerContextFixture());
});

afterEach(() => {
  jest.useRealTimers();
});

test("loadDashboardState builds a full DashboardState from the current CareerState", async () => {
  const { result } = renderHook(() => useDashboard());

  await act(async () => {
    await result.current.loadDashboardState();
  });

  expect(result.current.dashboardState.kpis.occupancyRate).toBe(100);
  expect(result.current.dashboardState.viewMode).toBe("casual");
  expect(dashboardRepository.loadDashboardPreferences).toHaveBeenCalled();
});

test("loadDashboardState uses an explicitly-passed CareerState instead of the (possibly stale) context one", async () => {
  const { result } = renderHook(() => useDashboard());

  const freshCareerState = careerFixture({ day: 4, lastDayReport: { ...careerFixture().lastDayReport, profit: 999 } });
  await act(async () => {
    await result.current.loadDashboardState(freshCareerState);
  });

  expect(result.current.dashboardState.kpis.profit).toBe(999);
});

test("loadDashboardState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useDashboard());
  await act(async () => {
    await result.current.loadDashboardState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.dashboardState.kpis).not.toBeNull();
});

test("getNotifications/getInsights/getQuickActions read from the loaded dashboardState", async () => {
  const { result } = renderHook(() => useDashboard());
  await act(async () => {
    await result.current.loadDashboardState();
  });

  expect(result.current.getNotifications()).toEqual(result.current.dashboardState.notifications);
  expect(result.current.getInsights()).toEqual(result.current.dashboardState.insights);
  expect(result.current.getQuickActions().length).toBeGreaterThan(0);
});

test("setViewMode rebuilds the dashboardState and persists the preference", async () => {
  const { result } = renderHook(() => useDashboard());
  await act(async () => {
    await result.current.loadDashboardState();
  });

  await act(async () => {
    await result.current.setViewMode("expert");
  });

  expect(result.current.dashboardState.viewMode).toBe("expert");
  expect(dashboardRepository.saveDashboardPreferences).toHaveBeenCalled();
});

test("applyQuickAction runs the action through Career's applyHotelAdjustment and refreshes the dashboardState", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    const nextHotel = updater(state.hotel);
    return { ...state, hotel: nextHotel };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useDashboard());
  await act(async () => {
    await result.current.loadDashboardState();
  });

  await act(async () => {
    await result.current.applyQuickAction("increase-marketing", { amount: 500 });
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(result.current.dashboardState).not.toBeNull();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadDashboardState/setViewMode bypass Supabase and use localStorage", async () => {
    const { result } = renderHook(() => useDashboard());
    await act(async () => {
      await result.current.loadDashboardState();
    });
    await act(async () => {
      await result.current.setViewMode("expert");
    });

    expect(dashboardRepository.loadDashboardPreferences).not.toHaveBeenCalled();
    expect(dashboardRepository.saveDashboardPreferences).not.toHaveBeenCalled();
    expect(result.current.dashboardState.viewMode).toBe("expert");
    expect(result.current.isGuest).toBe(true);
  });

  test("the guest preference persists across hook instances", async () => {
    const first = renderHook(() => useDashboard());
    await act(async () => {
      await first.result.current.loadDashboardState();
    });
    await act(async () => {
      await first.result.current.setViewMode("expert");
    });

    const second = renderHook(() => useDashboard());
    await act(async () => {
      await second.result.current.loadDashboardState();
    });

    expect(second.result.current.dashboardState.viewMode).toBe("expert");
  });

  // Regression test: loadDashboardState() called before useSupabaseSession()
  // has resolved must wait for the guest fallback instead of hitting
  // Supabase's dashboardRepository (see the equivalent test in
  // useCareer.test.js/useRestaurant.test.js).
  test("loadDashboardState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useDashboard());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadDashboardState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(dashboardRepository.loadDashboardPreferences).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.dashboardState).not.toBeNull();
  });
});

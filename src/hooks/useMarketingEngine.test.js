import { renderHook, act } from "@testing-library/react";
import { useMarketingEngine } from "./useMarketingEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import marketingRepository from "../lib/marketingRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/marketingRepository", () => ({
  getMarketingState: jest.fn(),
  saveMarketingState: jest.fn(),
  saveMarketingCampaigns: jest.fn(),
  saveMarketingChannels: jest.fn(),
  saveMarketingForecast: jest.fn(),
}));

function careerFixture(overrides = {}) {
  return {
    playerId: "player-1",
    day: 1,
    hotel: createGuestHotelBundle({ referenceDate: new Date("2026-09-10T12:00:00Z") }),
    ...overrides,
  };
}

function careerContextFixture(overrides = {}) {
  return {
    careerState: careerFixture(),
    loadCareerState: jest.fn(),
    applyHotelAdjustment: jest.fn(async (updater) => {
      const state = careerFixture();
      return { ...state, hotel: updater(state.hotel) };
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  const session = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(session) });
  useCareerContext.mockReturnValue(careerContextFixture());
  marketingRepository.getMarketingState.mockResolvedValue(null);
  marketingRepository.saveMarketingState.mockResolvedValue(undefined);
  marketingRepository.saveMarketingCampaigns.mockResolvedValue(undefined);
  marketingRepository.saveMarketingChannels.mockResolvedValue(undefined);
  marketingRepository.saveMarketingForecast.mockResolvedValue(undefined);
});

test("loadMarketingState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useMarketingEngine());

  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(result.current.marketingState.budget.total).toBeGreaterThanOrEqual(0);
  expect(result.current.marketingState.cyclesElapsed).toBe(1);
  expect(marketingRepository.saveMarketingState).toHaveBeenCalled();
});

test("loadMarketingState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, budget: { total: 999 } };
  marketingRepository.getMarketingState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(result.current.marketingState).toBe(stored);
  expect(marketingRepository.saveMarketingState).not.toHaveBeenCalled();
});

test("loadMarketingState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, budget: { total: 999 } };
  marketingRepository.getMarketingState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(result.current.marketingState.cyclesElapsed).toBe(2);
  expect(marketingRepository.saveMarketingState).toHaveBeenCalled();
});

// Same regression class hooks/useFinance.test.js/useStaffEngine.test.js
// cover: before any career exists, this must not compute or persist an
// all-zero cycle -- doing so would permanently stick cyclesElapsed at 1.
test("loadMarketingState does nothing (no compute, no persist) when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(result.current.marketingState).toBeNull();
  expect(marketingRepository.getMarketingState).not.toHaveBeenCalled();
  expect(marketingRepository.saveMarketingState).not.toHaveBeenCalled();
});

test("a subsequent loadMarketingState (once a career exists) computes real figures even after an earlier no-career call", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));
  const { result, rerender } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });
  expect(result.current.marketingState).toBeNull();

  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 0 }) }));
  rerender();
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(result.current.marketingState.budget).toBeDefined();
});

test("loadMarketingState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.marketingState).not.toBeNull();
});

test("applyMarketingAction runs the decision through Career's applyHotelAdjustment and recomputes marketing", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });
  await act(async () => {
    await result.current.applyMarketingAction("lancer-campagne");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(marketingRepository.saveMarketingState).toHaveBeenCalled();
  expect(marketingRepository.saveMarketingCampaigns).toHaveBeenCalled();
});

test("getMarketingDiagnostics/getMarketingForecast/getCampaigns/getChannels/getMarketingReport read from the loaded marketingState", async () => {
  const { result } = renderHook(() => useMarketingEngine());
  await act(async () => {
    await result.current.loadMarketingState();
  });

  expect(Array.isArray(result.current.getMarketingDiagnostics())).toBe(true);
  expect(result.current.getMarketingForecast().scenarios).toBeDefined();
  expect(Array.isArray(result.current.getCampaigns())).toBe(true);
  expect(Array.isArray(result.current.getChannels())).toBe(true);
  expect(result.current.getMarketingReport().budget).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadMarketingState works end to end with the (mocked) guest-aware marketingRepository", async () => {
    const { result } = renderHook(() => useMarketingEngine());
    await act(async () => {
      await result.current.loadMarketingState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.marketingState.budget).toBeDefined();
  });

  // Regression test: loadMarketingState() called before
  // useSupabaseSession() has resolved must still wait for the guest
  // fallback instead of hitting Supabase (see the equivalent test in
  // useFinance.test.js/useStaffEngine.test.js).
  test("loadMarketingState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useMarketingEngine());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadMarketingState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.marketingState).not.toBeNull();
  });
});

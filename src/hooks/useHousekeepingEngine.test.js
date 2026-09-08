import { renderHook, act } from "@testing-library/react";
import { useHousekeepingEngine } from "./useHousekeepingEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import housekeepingRepository from "../lib/housekeepingRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/housekeepingRepository", () => ({
  getHousekeepingState: jest.fn(),
  saveHousekeepingState: jest.fn(),
  saveHousekeepingForecast: jest.fn(),
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
  housekeepingRepository.getHousekeepingState.mockResolvedValue(null);
  housekeepingRepository.saveHousekeepingState.mockResolvedValue(undefined);
  housekeepingRepository.saveHousekeepingForecast.mockResolvedValue(undefined);
});

test("loadHousekeepingState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useHousekeepingEngine());

  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(result.current.housekeepingState.workload).toBeDefined();
  expect(result.current.housekeepingState.cyclesElapsed).toBe(1);
  expect(housekeepingRepository.saveHousekeepingState).toHaveBeenCalled();
});

test("loadHousekeepingState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, workload: { roomsToClean: 999 } };
  housekeepingRepository.getHousekeepingState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(result.current.housekeepingState).toBe(stored);
  expect(housekeepingRepository.saveHousekeepingState).not.toHaveBeenCalled();
});

test("loadHousekeepingState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, workload: { roomsToClean: 999 } };
  housekeepingRepository.getHousekeepingState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(result.current.housekeepingState.cyclesElapsed).toBe(2);
  expect(housekeepingRepository.saveHousekeepingState).toHaveBeenCalled();
});

// Same regression class hooks/useFinance.test.js/useStaffEngine.test.js/
// useMarketingEngine.test.js/useEsgEngine.test.js cover: before any
// career exists, this must not compute or persist an all-zero cycle --
// doing so would permanently stick cyclesElapsed at 1.
test("loadHousekeepingState does nothing (no compute, no persist) when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(result.current.housekeepingState).toBeNull();
  expect(housekeepingRepository.getHousekeepingState).not.toHaveBeenCalled();
  expect(housekeepingRepository.saveHousekeepingState).not.toHaveBeenCalled();
});

test("a subsequent loadHousekeepingState (once a career exists) computes real figures even after an earlier no-career call", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));
  const { result, rerender } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });
  expect(result.current.housekeepingState).toBeNull();

  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 0 }) }));
  rerender();
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(result.current.housekeepingState.workload).toBeDefined();
});

test("loadHousekeepingState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.housekeepingState).not.toBeNull();
});

test("applyHousekeepingAction runs the decision through Career's applyHotelAdjustment and recomputes HK", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });
  await act(async () => {
    await result.current.applyHousekeepingAction("ameliorer-qualite");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(housekeepingRepository.saveHousekeepingState).toHaveBeenCalled();
});

test("getHousekeepingDiagnostics/getHousekeepingForecast/getQualityScore/getHousekeepingReport read from the loaded housekeepingState", async () => {
  const { result } = renderHook(() => useHousekeepingEngine());
  await act(async () => {
    await result.current.loadHousekeepingState();
  });

  expect(Array.isArray(result.current.getHousekeepingDiagnostics())).toBe(true);
  expect(result.current.getHousekeepingForecast().scenarios).toBeDefined();
  expect(result.current.getQualityScore()).toBeGreaterThanOrEqual(0);
  expect(result.current.getHousekeepingReport().workload).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadHousekeepingState works end to end with the (mocked) guest-aware housekeepingRepository", async () => {
    const { result } = renderHook(() => useHousekeepingEngine());
    await act(async () => {
      await result.current.loadHousekeepingState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.housekeepingState.workload).toBeDefined();
  });

  // Regression test: loadHousekeepingState() called before
  // useSupabaseSession() has resolved must still wait for the guest
  // fallback instead of hitting Supabase (see the equivalent test in
  // useFinance.test.js/useStaffEngine.test.js/useMarketingEngine.test
  // .js/useEsgEngine.test.js).
  test("loadHousekeepingState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useHousekeepingEngine());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadHousekeepingState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.housekeepingState).not.toBeNull();
  });
});

import { renderHook, act } from "@testing-library/react";
import { useEsgEngine } from "./useEsgEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import esgRepository from "../lib/esgRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/esgRepository", () => ({
  getEsgState: jest.fn(),
  saveEsgState: jest.fn(),
  saveEsgForecast: jest.fn(),
  saveEsgCertifications: jest.fn(),
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
  esgRepository.getEsgState.mockResolvedValue(null);
  esgRepository.saveEsgState.mockResolvedValue(undefined);
  esgRepository.saveEsgForecast.mockResolvedValue(undefined);
  esgRepository.saveEsgCertifications.mockResolvedValue(undefined);
});

test("loadEsgState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useEsgEngine());

  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(result.current.esgState.energy).toBeGreaterThanOrEqual(0);
  expect(result.current.esgState.cyclesElapsed).toBe(1);
  expect(esgRepository.saveEsgState).toHaveBeenCalled();
});

test("loadEsgState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, energy: 999 };
  esgRepository.getEsgState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(result.current.esgState).toBe(stored);
  expect(esgRepository.saveEsgState).not.toHaveBeenCalled();
});

test("loadEsgState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, energy: 999 };
  esgRepository.getEsgState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(result.current.esgState.cyclesElapsed).toBe(2);
  expect(esgRepository.saveEsgState).toHaveBeenCalled();
});

// Same regression class hooks/useFinance.test.js/useStaffEngine.test.js/
// useMarketingEngine.test.js cover: before any career exists, this must
// not compute or persist an all-zero cycle -- doing so would
// permanently stick cyclesElapsed at 1.
test("loadEsgState does nothing (no compute, no persist) when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(result.current.esgState).toBeNull();
  expect(esgRepository.getEsgState).not.toHaveBeenCalled();
  expect(esgRepository.saveEsgState).not.toHaveBeenCalled();
});

test("a subsequent loadEsgState (once a career exists) computes real figures even after an earlier no-career call", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));
  const { result, rerender } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });
  expect(result.current.esgState).toBeNull();

  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 0 }) }));
  rerender();
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(result.current.esgState.energy).toBeGreaterThanOrEqual(0);
});

test("loadEsgState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.esgState).not.toBeNull();
});

test("applyEsgAction runs the decision through Career's applyHotelAdjustment and recomputes ESG", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });
  await act(async () => {
    await result.current.applyEsgAction("reduire-energie");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(esgRepository.saveEsgState).toHaveBeenCalled();
});

test("getEsgDiagnostics/getEsgForecast/getCertifications/getEsgReport read from the loaded esgState", async () => {
  const { result } = renderHook(() => useEsgEngine());
  await act(async () => {
    await result.current.loadEsgState();
  });

  expect(Array.isArray(result.current.getEsgDiagnostics())).toBe(true);
  expect(result.current.getEsgForecast().scenarios).toBeDefined();
  expect(Array.isArray(result.current.getCertifications())).toBe(true);
  expect(result.current.getEsgReport().energy).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadEsgState works end to end with the (mocked) guest-aware esgRepository", async () => {
    const { result } = renderHook(() => useEsgEngine());
    await act(async () => {
      await result.current.loadEsgState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.esgState.energy).toBeGreaterThanOrEqual(0);
  });

  // Regression test: loadEsgState() called before useSupabaseSession()
  // has resolved must still wait for the guest fallback instead of
  // hitting Supabase (see the equivalent test in useFinance.test.js/
  // useStaffEngine.test.js/useMarketingEngine.test.js).
  test("loadEsgState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useEsgEngine());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadEsgState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.esgState).not.toBeNull();
  });
});

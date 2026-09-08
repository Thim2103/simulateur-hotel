import { renderHook, act } from "@testing-library/react";
import { useFinance } from "./useFinance";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import financeRepository from "../lib/financeRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/financeRepository", () => ({
  getFinanceState: jest.fn(),
  saveFinanceState: jest.fn(),
  appendFinanceReport: jest.fn(),
  saveFinanceForecast: jest.fn(),
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
  financeRepository.getFinanceState.mockResolvedValue(null);
  financeRepository.saveFinanceState.mockResolvedValue(undefined);
  financeRepository.appendFinanceReport.mockResolvedValue(undefined);
  financeRepository.saveFinanceForecast.mockResolvedValue(undefined);
});

test("loadFinanceState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useFinance());

  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.financeState.incomeStatement.revenues.total).toBeGreaterThan(0);
  expect(result.current.financeState.cyclesElapsed).toBe(1);
  expect(financeRepository.saveFinanceState).toHaveBeenCalled();
});

test("loadFinanceState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, incomeStatement: { revenues: { total: 999 } } };
  financeRepository.getFinanceState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.financeState).toBe(stored);
  expect(financeRepository.saveFinanceState).not.toHaveBeenCalled();
});

test("loadFinanceState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, cash: 40000, incomeStatement: { revenues: { total: 999 } } };
  financeRepository.getFinanceState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.financeState.cyclesElapsed).toBe(2);
  expect(financeRepository.saveFinanceState).toHaveBeenCalled();
});

// Regression test for a real bug found during manual verification: before
// any career exists (e.g. FinanceDashboard.jsx's own mount-time
// loadFinanceState(), which runs before the player has necessarily
// started a career), this must not compute or persist an all-zero cycle
// -- doing so would permanently stick cyclesElapsed at 1, so once a real
// career starts at day 0, `0 > 1` would be false and the all-zero cycle
// would never get replaced (see loadFinanceState()'s docstring).
test("loadFinanceState does nothing (no compute, no persist) when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.financeState).toBeNull();
  expect(financeRepository.getFinanceState).not.toHaveBeenCalled();
  expect(financeRepository.saveFinanceState).not.toHaveBeenCalled();
});

test("a subsequent loadFinanceState (once a career exists) computes real figures even after an earlier no-career call", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));
  const { result, rerender } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });
  expect(result.current.financeState).toBeNull();

  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 0 }) }));
  rerender();
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.financeState.incomeStatement.revenues.total).toBeGreaterThan(0);
});

test("loadFinanceState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.financeState).not.toBeNull();
});

test("applyFinancialDecision runs the decision through Career's applyHotelAdjustment and recomputes finance", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });
  await act(async () => {
    await result.current.applyFinancialDecision("increase-marketing-budget", { amount: 500 });
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(financeRepository.saveFinanceState).toHaveBeenCalled();
  expect(financeRepository.appendFinanceReport).toHaveBeenCalled();
});

test("getFinancialReport/getFinancialDiagnostics/getFinancialForecast read from the loaded financeState", async () => {
  const { result } = renderHook(() => useFinance());
  await act(async () => {
    await result.current.loadFinanceState();
  });

  expect(result.current.getFinancialReport().incomeStatement).toBeDefined();
  expect(Array.isArray(result.current.getFinancialDiagnostics())).toBe(true);
  expect(result.current.getFinancialForecast().scenarios).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadFinanceState works end to end with the (mocked) guest-aware financeRepository", async () => {
    const { result } = renderHook(() => useFinance());
    await act(async () => {
      await result.current.loadFinanceState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.financeState.incomeStatement).toBeDefined();
  });

  // Regression test: loadFinanceState() called before useSupabaseSession()
  // has resolved must still wait for the guest fallback instead of
  // hitting Supabase (see the equivalent test in useCareer.test.js/
  // useDashboard.test.js).
  test("loadFinanceState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useFinance());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadFinanceState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.financeState).not.toBeNull();
  });
});

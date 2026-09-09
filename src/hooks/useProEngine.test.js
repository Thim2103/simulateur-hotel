import { renderHook, act } from "@testing-library/react";
import { useProEngine } from "./useProEngine";
import { useSupabaseSession } from "./useSupabaseSession";
import proRepository from "../lib/proRepository";

jest.mock("./useSupabaseSession");
jest.mock("../lib/proRepository", () => ({
  getProState: jest.fn(),
  saveProState: jest.fn(),
  saveProReport: jest.fn(),
  saveProScore: jest.fn(),
  saveProForecast: jest.fn(),
  saveProDiagnostics: jest.fn(),
}));

function hotelConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "optimisation", segments: ["leisure"], ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  const session = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(session) });
  proRepository.getProState.mockResolvedValue(null);
  proRepository.saveProState.mockResolvedValue(undefined);
  proRepository.saveProReport.mockResolvedValue(undefined);
  proRepository.saveProScore.mockResolvedValue(undefined);
  proRepository.saveProForecast.mockResolvedValue(undefined);
  proRepository.saveProDiagnostics.mockResolvedValue(undefined);
});

test("startPro creates and persists a fresh, active ProState", async () => {
  const { result } = renderHook(() => useProEngine());

  await act(async () => {
    await result.current.startPro(hotelConfig());
  });

  expect(result.current.proState.status).toBe("active");
  expect(result.current.proState.month).toBe(0);
  expect(result.current.proState.horizonMonths).toBe(24);
  expect(proRepository.saveProState).toHaveBeenCalled();
});

test("loadProState reads back whatever is already persisted, without advancing the month", async () => {
  const stored = { proId: "pro-1", status: "active", month: 5 };
  proRepository.getProState.mockResolvedValue(stored);

  const { result } = renderHook(() => useProEngine());
  await act(async () => {
    await result.current.loadProState();
  });

  expect(result.current.proState).toBe(stored);
  expect(proRepository.saveProState).not.toHaveBeenCalled();
});

test("playProMonth advances the month and persists state/score/forecast/diagnostics", async () => {
  const { result } = renderHook(() => useProEngine());
  await act(async () => {
    await result.current.startPro(hotelConfig());
  });
  await act(async () => {
    await result.current.playProMonth();
  });

  expect(result.current.proState.month).toBe(1);
  expect(proRepository.saveProState).toHaveBeenCalled();
  expect(proRepository.saveProScore).toHaveBeenCalled();
  expect(proRepository.saveProForecast).toHaveBeenCalled();
  expect(proRepository.saveProDiagnostics).toHaveBeenCalled();
  expect(proRepository.saveProReport).not.toHaveBeenCalled(); // not month 24 yet
});

test("applyProAction mutates the embedded hotel bundle and persists it, without advancing the month", async () => {
  const { result } = renderHook(() => useProEngine());
  await act(async () => {
    await result.current.startPro(hotelConfig());
  });
  const budgetBefore = result.current.proState.career.hotel.hotelState.marketing.budget;

  await act(async () => {
    await result.current.applyProAction("plan-relance-globale");
  });

  expect(result.current.proState.career.hotel.hotelState.marketing.budget).toBeGreaterThan(budgetBefore);
  expect(result.current.proState.month).toBe(0);
  expect(proRepository.saveProState).toHaveBeenCalled();
});

test("getProDiagnostics/getProForecast/getProScore/getProReport read from the loaded proState", async () => {
  const { result } = renderHook(() => useProEngine());
  await act(async () => {
    await result.current.startPro(hotelConfig());
  });
  await act(async () => {
    await result.current.playProMonth();
  });

  expect(Array.isArray(result.current.getProDiagnostics())).toBe(true);
  expect(result.current.getProForecast().scenarios).toBeDefined();
  expect(result.current.getProScore().total).toBeGreaterThanOrEqual(0);
  expect(result.current.getProReport()).toBeNull(); // not completed yet
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("startPro/playProMonth work end to end with the (mocked) guest-aware proRepository", async () => {
    const { result } = renderHook(() => useProEngine());
    await act(async () => {
      await result.current.startPro(hotelConfig());
    });
    await act(async () => {
      await result.current.playProMonth();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.proState.month).toBe(1);
  });

  // Regression test: an action called before useSupabaseSession() has
  // resolved must still wait for the guest fallback instead of hitting
  // Supabase (same pattern as useTfeEngine.test.js's own regression test).
  test("startPro called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useProEngine());
    let startPromise;
    act(() => {
      startPromise = result.current.startPro(hotelConfig());
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await startPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.proState).not.toBeNull();
  });
});

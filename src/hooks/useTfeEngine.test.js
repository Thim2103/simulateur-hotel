import { renderHook, act } from "@testing-library/react";
import { useTfeEngine } from "./useTfeEngine";
import { useSupabaseSession } from "./useSupabaseSession";
import tfeRepository from "../lib/tfeRepository";

jest.mock("./useSupabaseSession");
jest.mock("../lib/tfeRepository", () => ({
  getTfeState: jest.fn(),
  saveTfeState: jest.fn(),
  saveTfeReport: jest.fn(),
  saveTfeScore: jest.fn(),
  saveTfeForecast: jest.fn(),
}));

function hotelConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "rentabilite", segments: ["leisure"], ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  const session = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(session) });
  tfeRepository.getTfeState.mockResolvedValue(null);
  tfeRepository.saveTfeState.mockResolvedValue(undefined);
  tfeRepository.saveTfeReport.mockResolvedValue(undefined);
  tfeRepository.saveTfeScore.mockResolvedValue(undefined);
  tfeRepository.saveTfeForecast.mockResolvedValue(undefined);
});

test("startTfe creates and persists a fresh, active TfeState", async () => {
  const { result } = renderHook(() => useTfeEngine());

  await act(async () => {
    await result.current.startTfe(hotelConfig());
  });

  expect(result.current.tfeState.status).toBe("active");
  expect(result.current.tfeState.month).toBe(0);
  expect(tfeRepository.saveTfeState).toHaveBeenCalled();
});

test("loadTfeState reads back whatever is already persisted, without advancing the month", async () => {
  const stored = { tfeId: "tfe-1", status: "active", month: 5 };
  tfeRepository.getTfeState.mockResolvedValue(stored);

  const { result } = renderHook(() => useTfeEngine());
  await act(async () => {
    await result.current.loadTfeState();
  });

  expect(result.current.tfeState).toBe(stored);
  expect(tfeRepository.saveTfeState).not.toHaveBeenCalled();
});

test("playTfeMonth advances the month and persists state/score/forecast", async () => {
  const { result } = renderHook(() => useTfeEngine());
  await act(async () => {
    await result.current.startTfe(hotelConfig());
  });
  await act(async () => {
    await result.current.playTfeMonth();
  });

  expect(result.current.tfeState.month).toBe(1);
  expect(tfeRepository.saveTfeState).toHaveBeenCalled();
  expect(tfeRepository.saveTfeScore).toHaveBeenCalled();
  expect(tfeRepository.saveTfeForecast).toHaveBeenCalled();
  expect(tfeRepository.saveTfeReport).not.toHaveBeenCalled(); // not month 36 yet
});

test("applyTfeAction mutates the embedded hotel bundle and persists it, without advancing the month", async () => {
  const { result } = renderHook(() => useTfeEngine());
  await act(async () => {
    await result.current.startTfe(hotelConfig());
  });
  const budgetBefore = result.current.tfeState.career.hotel.hotelState.marketing.budget;

  await act(async () => {
    await result.current.applyTfeAction("plan-relance");
  });

  expect(result.current.tfeState.career.hotel.hotelState.marketing.budget).toBeGreaterThan(budgetBefore);
  expect(result.current.tfeState.month).toBe(0);
  expect(tfeRepository.saveTfeState).toHaveBeenCalled();
});

test("getTfeDiagnostics/getTfeForecast/getTfeScore/getTfeReport read from the loaded tfeState", async () => {
  const { result } = renderHook(() => useTfeEngine());
  await act(async () => {
    await result.current.startTfe(hotelConfig());
  });
  await act(async () => {
    await result.current.playTfeMonth();
  });

  expect(Array.isArray(result.current.getTfeDiagnostics())).toBe(true);
  expect(result.current.getTfeForecast().scenarios).toBeDefined();
  expect(result.current.getTfeScore().total).toBeGreaterThanOrEqual(0);
  expect(result.current.getTfeReport()).toBeNull(); // not completed yet
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("startTfe/playTfeMonth work end to end with the (mocked) guest-aware tfeRepository", async () => {
    const { result } = renderHook(() => useTfeEngine());
    await act(async () => {
      await result.current.startTfe(hotelConfig());
    });
    await act(async () => {
      await result.current.playTfeMonth();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.tfeState.month).toBe(1);
  });

  // Regression test: an action called before useSupabaseSession() has
  // resolved must still wait for the guest fallback instead of hitting
  // Supabase (see the equivalent test in useFinance.test.js/
  // useStaffEngine.test.js/useMarketingEngine.test.js/useEsgEngine.test
  // .js/useHousekeepingEngine.test.js).
  test("startTfe called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useTfeEngine());
    let startPromise;
    act(() => {
      startPromise = result.current.startTfe(hotelConfig());
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await startPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.tfeState).not.toBeNull();
  });
});

import { renderHook, act } from "@testing-library/react";
import { useStaffEngine } from "./useStaffEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import staffRepository from "../lib/staffRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/staffRepository", () => ({
  getStaffState: jest.fn(),
  saveStaffState: jest.fn(),
  saveStaffForecast: jest.fn(),
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
  staffRepository.getStaffState.mockResolvedValue(null);
  staffRepository.saveStaffState.mockResolvedValue(undefined);
  staffRepository.saveStaffForecast.mockResolvedValue(undefined);
});

test("loadStaffState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useStaffEngine());

  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(result.current.staffState.headcount.total).toBeGreaterThan(0);
  expect(result.current.staffState.cyclesElapsed).toBe(1);
  expect(staffRepository.saveStaffState).toHaveBeenCalled();
});

test("loadStaffState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, headcount: { total: 999 } };
  staffRepository.getStaffState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(result.current.staffState).toBe(stored);
  expect(staffRepository.saveStaffState).not.toHaveBeenCalled();
});

test("loadStaffState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, headcount: { total: 999 } };
  staffRepository.getStaffState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(result.current.staffState.cyclesElapsed).toBe(2);
  expect(staffRepository.saveStaffState).toHaveBeenCalled();
});

// Same regression class hooks/useFinance.test.js covers: before any
// career exists (e.g. StaffDashboard.jsx's own mount-time
// loadStaffState()), this must not compute or persist an all-zero cycle
// -- doing so would permanently stick cyclesElapsed at 1.
test("loadStaffState does nothing (no compute, no persist) when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(result.current.staffState).toBeNull();
  expect(staffRepository.getStaffState).not.toHaveBeenCalled();
  expect(staffRepository.saveStaffState).not.toHaveBeenCalled();
});

test("a subsequent loadStaffState (once a career exists) computes real figures even after an earlier no-career call", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));
  const { result, rerender } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });
  expect(result.current.staffState).toBeNull();

  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 0 }) }));
  rerender();
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(result.current.staffState.headcount.total).toBeGreaterThan(0);
});

test("loadStaffState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.staffState).not.toBeNull();
});

test("applyStaffAction runs the decision through Career's applyHotelAdjustment and recomputes staff", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });
  await act(async () => {
    await result.current.applyStaffAction("recruter");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(staffRepository.saveStaffState).toHaveBeenCalled();
});

test("getStaffDiagnostics/getStaffForecast/getStaffReport read from the loaded staffState", async () => {
  const { result } = renderHook(() => useStaffEngine());
  await act(async () => {
    await result.current.loadStaffState();
  });

  expect(Array.isArray(result.current.getStaffDiagnostics())).toBe(true);
  expect(result.current.getStaffForecast().scenarios).toBeDefined();
  expect(result.current.getStaffReport().headcount).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadStaffState works end to end with the (mocked) guest-aware staffRepository", async () => {
    const { result } = renderHook(() => useStaffEngine());
    await act(async () => {
      await result.current.loadStaffState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.staffState.headcount).toBeDefined();
  });

  // Regression test: loadStaffState() called before useSupabaseSession()
  // has resolved must still wait for the guest fallback instead of
  // hitting Supabase (see the equivalent test in useFinance.test.js).
  test("loadStaffState called before the session resolves still waits for the guest fallback", async () => {
    let resolveSessionPromise;
    const pendingReload = jest.fn(() => new Promise((resolve) => { resolveSessionPromise = resolve; }));
    useSupabaseSession.mockReturnValue({ session: null, loading: true, isGuest: false, reload: pendingReload });

    const { result } = renderHook(() => useStaffEngine());
    let loadPromise;
    act(() => {
      loadPromise = result.current.loadStaffState();
    });

    resolveSessionPromise({ user: { id: "guest-1" }, mode: "guest" });
    await act(async () => {
      await loadPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.staffState).not.toBeNull();
  });
});

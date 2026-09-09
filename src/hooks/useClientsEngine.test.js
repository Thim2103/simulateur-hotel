import { renderHook, act } from "@testing-library/react";
import { useClientsEngine } from "./useClientsEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import clientsRepository from "../lib/clientsRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/clientsRepository", () => ({
  getClientsState: jest.fn(),
  saveClientsState: jest.fn(),
  saveClientsForecast: jest.fn(),
}));

function careerFixture(overrides = {}) {
  return {
    playerId: "player-1",
    day: 1,
    hotel: createGuestHotelBundle({ referenceDate: new Date("2026-09-16T12:00:00Z") }),
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
  clientsRepository.getClientsState.mockResolvedValue(null);
  clientsRepository.saveClientsState.mockResolvedValue(undefined);
  clientsRepository.saveClientsForecast.mockResolvedValue(undefined);
});

test("loadClientsState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useClientsEngine());

  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(result.current.clientsState.segments).toBeDefined();
  expect(result.current.clientsState.cyclesElapsed).toBe(1);
  expect(clientsRepository.saveClientsState).toHaveBeenCalled();
});

test("loadClientsState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, satisfaction: 70, loyalty: 58 };
  clientsRepository.getClientsState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(result.current.clientsState).toBe(stored);
  expect(clientsRepository.saveClientsState).not.toHaveBeenCalled();
});

test("loadClientsState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, satisfaction: 70 };
  clientsRepository.getClientsState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(result.current.clientsState.cyclesElapsed).toBe(2);
  expect(clientsRepository.saveClientsState).toHaveBeenCalled();
});

test("loadClientsState does nothing when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(result.current.clientsState).toBeNull();
  expect(clientsRepository.getClientsState).not.toHaveBeenCalled();
  expect(clientsRepository.saveClientsState).not.toHaveBeenCalled();
});

test("loadClientsState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.clientsState).not.toBeNull();
});

test("applyClientsAction runs the decision through Career's applyHotelAdjustment and recomputes clients", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });
  await act(async () => {
    await result.current.applyClientsAction("ameliorer-accueil");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(clientsRepository.saveClientsState).toHaveBeenCalled();
});

test("getClientsDiagnostics/getClientsForecast/getSegments/getReviews/getLoyalty/getClientsReport all work", async () => {
  const { result } = renderHook(() => useClientsEngine());
  await act(async () => {
    await result.current.loadClientsState();
  });

  expect(Array.isArray(result.current.getClientsDiagnostics())).toBe(true);
  expect(result.current.getClientsForecast()?.scenarios).toBeDefined();
  expect(typeof result.current.getSegments()?.business).toBe("number");
  expect(typeof result.current.getReviews()?.avgRating).toBe("number");
  expect(typeof result.current.getLoyalty()).toBe("number");
  expect(result.current.getClientsReport()?.replay).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadClientsState works end to end in guest mode", async () => {
    const { result } = renderHook(() => useClientsEngine());
    await act(async () => {
      await result.current.loadClientsState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.clientsState.satisfaction).toBeGreaterThanOrEqual(0);
  });
});

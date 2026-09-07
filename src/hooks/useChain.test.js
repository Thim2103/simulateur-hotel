import { act, renderHook } from "@testing-library/react";
import { useChain } from "./useChain";

const mockRunChainCycleEngine = jest.fn();

jest.mock("../lib/multiHotel", () => {
  const actual = jest.requireActual("../lib/multiHotel");
  return { ...actual, runChainCycle: (...args) => mockRunChainCycleEngine(...args) };
});

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    hotels: [],
    finance: { totalRevenue: 100, totalExpenses: 50, totalProfit: 50 },
    rm: { consolidatedForecast: { next7: 0, next30: 0, next90: 0 }, consolidatedPickup: {}, recommendedADR: 0 },
    progression: { chainLevel: { level: 1, title: "Nouveau gérant" }, chainXP: 5, chainReputation: 50, achievements: [] },
    events: { regionalEvents: [], globalEvents: [] },
    ...overrides,
  };
}

beforeEach(() => {
  mockRunChainCycleEngine.mockReset();
});

test("starts with an empty chain and no active hotel", () => {
  const { result } = renderHook(() => useChain());
  expect(result.current.chainState.hotels).toEqual([]);
  expect(result.current.activeHotel).toBeNull();
});

test("addHotel() creates a hotel and adds it to the chain state", () => {
  const { result } = renderHook(() => useChain());

  act(() => {
    result.current.addHotel({ name: "Riviera Palace", city: "Nice" });
  });

  expect(result.current.chainState.hotels).toHaveLength(1);
  expect(result.current.chainState.hotels[0].name).toBe("Riviera Palace");
  expect(result.current.activeHotel.name).toBe("Riviera Palace");
});

test("switchHotel() changes which hotel is active", () => {
  const { result } = renderHook(() => useChain());

  act(() => {
    result.current.addHotel({ id: "a", name: "Hotel A" });
    result.current.addHotel({ id: "b", name: "Hotel B" });
  });
  act(() => {
    result.current.switchHotel("b");
  });

  expect(result.current.activeHotel.id).toBe("b");
});

test("runChainCycle() calls the engine with the chain's hotels and stores the report", async () => {
  mockRunChainCycleEngine.mockResolvedValue({ report: sampleReport(), hotels: [], chainProgressionState: { xp: 10 } });
  const { result } = renderHook(() => useChain());

  act(() => {
    result.current.addHotel({ id: "a", name: "Hotel A" });
  });

  await act(async () => {
    await result.current.runChainCycle();
  });

  expect(mockRunChainCycleEngine).toHaveBeenCalledWith(expect.objectContaining({ hotels: expect.arrayContaining([expect.objectContaining({ id: "a" })]) }));
  expect(result.current.chainReport).toEqual(sampleReport());
});

test("runChainCycle() replaces the chain's hotels with the engine's updated bundles", async () => {
  mockRunChainCycleEngine.mockResolvedValue({
    report: sampleReport(),
    hotels: [{ id: "a", name: "Hotel A (updated)" }],
    chainProgressionState: {},
  });
  const { result } = renderHook(() => useChain());

  act(() => {
    result.current.addHotel({ id: "a", name: "Hotel A" });
  });
  await act(async () => {
    await result.current.runChainCycle();
  });

  expect(result.current.chainState.hotels[0].name).toBe("Hotel A (updated)");
});

test("carries the chain progression state from one cycle into the next", async () => {
  mockRunChainCycleEngine.mockResolvedValue({ report: sampleReport(), hotels: [], chainProgressionState: { xp: 42 } });
  const { result } = renderHook(() => useChain());

  act(() => {
    result.current.addHotel({ id: "a" });
  });
  await act(async () => {
    await result.current.runChainCycle();
  });
  await act(async () => {
    await result.current.runChainCycle();
  });

  expect(mockRunChainCycleEngine).toHaveBeenLastCalledWith(expect.objectContaining({ chainProgressionState: { xp: 42 } }));
});

test("toggles isRunning for the duration of the run", async () => {
  let resolveRun;
  mockRunChainCycleEngine.mockReturnValue(new Promise((resolve) => { resolveRun = resolve; }));
  const { result } = renderHook(() => useChain());
  act(() => { result.current.addHotel({ id: "a" }); });

  let runPromise;
  act(() => {
    runPromise = result.current.runChainCycle();
  });
  expect(result.current.isRunning).toBe(true);

  await act(async () => {
    resolveRun({ report: sampleReport(), hotels: [], chainProgressionState: {} });
    await runPromise;
  });
  expect(result.current.isRunning).toBe(false);
});

test("surfaces and rethrows an error from the engine, and clears isRunning", async () => {
  mockRunChainCycleEngine.mockRejectedValue(new Error("bad chain"));
  const { result } = renderHook(() => useChain());
  act(() => { result.current.addHotel({ id: "a" }); });

  await act(async () => {
    await expect(result.current.runChainCycle()).rejects.toThrow("bad chain");
  });

  expect(result.current.isRunning).toBe(false);
  expect(result.current.error).toBeInstanceOf(Error);
});

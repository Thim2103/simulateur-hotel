const mockRunDailyCycle = jest.fn();

jest.mock("../dailyCycle/runDailyCycle", () => ({
  runDailyCycle: (...args) => mockRunDailyCycle(...args),
}));

// eslint-disable-next-line import/first
import { runChainCycle } from "./chainEngine";
// eslint-disable-next-line import/first
import { createHotel } from "./hotelFactory";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function fakeDailyReport(overrides = {}) {
  return {
    date: "2026-09-10",
    hotelRevenue: { netRevenue: 200 },
    restaurantRevenue: { netRevenue: 100 },
    expenses: { total: 150 },
    profit: 150,
    events: [],
    rmReport: { forecast: { next7: 1000, next30: 4000, next90: 12000 }, pickup: { daily: {} }, pricing: { recommendedADR: 180 } },
    progressionReport: { reputation: 65 },
    nextState: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockRunDailyCycle.mockReset();
});

test("calls runDailyCycle() once per hotel in the chain", async () => {
  mockRunDailyCycle.mockResolvedValue(fakeDailyReport());
  const hotels = [createHotel({ id: "a", city: "Paris" }), createHotel({ id: "b", city: "Lyon" })];

  await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(mockRunDailyCycle).toHaveBeenCalledTimes(2);
});

test("only passes persist: true through for a hotel explicitly marked persist", async () => {
  mockRunDailyCycle.mockResolvedValue(fakeDailyReport());
  const hotels = [createHotel({ id: "a", persist: true }), createHotel({ id: "b", persist: false })];

  await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const persistFlags = mockRunDailyCycle.mock.calls.map((call) => call[0].persist);
  expect(persistFlags.sort()).toEqual([false, true]);
});

test("returns a ChainReport with exactly the documented shape", async () => {
  mockRunDailyCycle.mockResolvedValue(fakeDailyReport());
  const hotels = [createHotel({ id: "a", city: "Paris" })];

  const { report } = await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report).toEqual({
    date: "2026-09-10",
    hotels: [expect.objectContaining({ id: "a", city: "Paris", dailyReport: expect.any(Object) })],
    finance: { totalRevenue: expect.any(Number), totalExpenses: expect.any(Number), totalProfit: expect.any(Number) },
    rm: expect.objectContaining({ consolidatedForecast: expect.any(Object), consolidatedPickup: expect.any(Object), recommendedADR: expect.any(Number) }),
    progression: expect.objectContaining({ chainLevel: expect.any(Object), chainXP: expect.any(Number), chainReputation: expect.any(Number), achievements: expect.any(Array) }),
    events: { regionalEvents: expect.any(Array), globalEvents: expect.any(Array) },
  });
});

test("consolidates finance and RM across every hotel's own daily report", async () => {
  mockRunDailyCycle
    .mockResolvedValueOnce(fakeDailyReport({ profit: 100 }))
    .mockResolvedValueOnce(fakeDailyReport({ profit: 50 }));
  const hotels = [createHotel({ id: "a" }), createHotel({ id: "b" })];

  const { report } = await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.finance.totalProfit).toBe(150);
  expect(report.rm.consolidatedForecast.next7).toBe(2000); // 1000 + 1000
});

test("returns updated hotel bundles carrying each hotel's nextState forward", async () => {
  const updatedHotelState = { structure: { name: "Updated" } };
  mockRunDailyCycle.mockResolvedValue(
    fakeDailyReport({ nextState: { hotelState: updatedHotelState, restaurantState: {}, rooms: [], reservations: [] } })
  );
  const hotels = [createHotel({ id: "a" })];

  const { hotels: nextHotels } = await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(nextHotels[0].hotelState).toBe(updatedHotelState);
});

test("carries the chain's progression state forward to the next cycle instead of resetting it", async () => {
  mockRunDailyCycle.mockResolvedValue(fakeDailyReport({ profit: 500 }));
  const hotels = [createHotel({ id: "a" })];

  const day1 = await runChainCycle({ hotels, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const day2 = await runChainCycle({ hotels, chainProgressionState: day1.chainProgressionState, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(day2.report.progression.chainXP).toBeGreaterThan(day1.report.progression.chainXP);
});

test("handles an empty chain without throwing", async () => {
  await expect(runChainCycle({ hotels: [] })).resolves.toEqual(
    expect.objectContaining({ report: expect.objectContaining({ hotels: [] }) })
  );
  expect(mockRunDailyCycle).not.toHaveBeenCalled();
});

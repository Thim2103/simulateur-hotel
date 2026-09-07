const mockSaveDailyState = jest.fn().mockResolvedValue({ hotel: null, restaurant: null, pms: { rooms: [], reservations: [] } });

jest.mock("./saveDailyState", () => ({
  saveDailyState: (...args) => mockSaveDailyState(...args),
}));

// eslint-disable-next-line import/first
import { runDailyCycle } from "./runDailyCycle";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseState() {
  return {
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {} },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }],
  };
}

beforeEach(() => {
  mockSaveDailyState.mockClear();
});

test("returns a DailyReport with the documented shape", async () => {
  const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });

  expect(report).toEqual(
    expect.objectContaining({
      date: "2026-09-10",
      hotelRevenue: expect.any(Object),
      restaurantRevenue: expect.any(Object),
      expenses: expect.any(Object),
      profit: expect.any(Number),
      events: expect.any(Array),
      staffChanges: expect.any(Object),
      reservationsChanges: expect.any(Object),
    })
  );
});

test("checks in today's arrival as part of the run and reports it", async () => {
  const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });

  expect(report.reservationsChanges.checkIns).toEqual([{ id: 1, client: "Ada", roomId: 1 }]);
  expect(report.hotelRevenue.occupiedRooms).toBe(1);
});

test("profit is hotel + restaurant revenue minus expenses", async () => {
  const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });

  const totalRevenue = report.hotelRevenue.netRevenue + report.hotelRevenue.eventRevenue + report.restaurantRevenue.netRevenue;
  expect(report.profit).toBe(Math.round(totalRevenue - report.expenses.total));
});

test("does not persist anything when persist: false", async () => {
  await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
  expect(mockSaveDailyState).not.toHaveBeenCalled();
});

test("persists the updated state and only the changed PMS rows by default", async () => {
  await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(mockSaveDailyState).toHaveBeenCalledTimes(1);
  const call = mockSaveDailyState.mock.calls[0][0];
  expect(call.hotelState.finance).toBeDefined();
  expect(call.restaurantState.finance).toBeDefined();
  expect(call.rooms).toEqual([expect.objectContaining({ id: 1, status: "occupée" })]);
});

test("random events can push profit down without crashing the pipeline", async () => {
  // rng() => 0 makes every candidate event fire.
  const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0, persist: false });
  expect(report.events.length).toBeGreaterThan(0);
  expect(Number.isFinite(report.profit)).toBe(true);
});

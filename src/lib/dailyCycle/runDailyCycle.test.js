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
      rmReport: expect.objectContaining({
        forecast: expect.objectContaining({ next7: expect.any(Number), next30: expect.any(Number), next90: expect.any(Number) }),
        pickup: expect.any(Object),
        pricing: expect.objectContaining({ recommendedADR: expect.any(Number), minPrice: expect.any(Number), maxPrice: expect.any(Number) }),
        segmentation: expect.any(Object),
        recommendations: expect.any(Array),
      }),
      progressionReport: expect.objectContaining({
        reputation: expect.any(Number),
        xp: expect.any(Number),
        level: expect.objectContaining({ level: expect.any(Number), title: expect.any(String) }),
        objectivesCompleted: expect.any(Array),
        newAchievements: expect.any(Array),
        rewards: expect.any(Array),
        storylineEvents: expect.any(Array),
      }),
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

describe("lib/events integration", () => {
  test("a day with no triggered events reports an empty events list", async () => {
    const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    expect(report.events).toEqual([]);
  });

  test("triggered events' costs are folded into today's expenses", async () => {
    const withoutEvents = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    const withEvents = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0, persist: false });

    expect(withEvents.events.length).toBeGreaterThan(0);
    expect(withEvents.expenses.eventCosts).toBeGreaterThan(withoutEvents.expenses.eventCosts);
  });

  test("a multi-day event persists into hotelState.progression.activeEvents for tomorrow's run", async () => {
    let savedHotelState = null;
    mockSaveDailyState.mockImplementationOnce(async ({ hotelState }) => {
      savedHotelState = hotelState;
      return { hotel: null, restaurant: null, pms: { rooms: [], reservations: [] } };
    });

    await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0 }); // triggers every event

    expect(Array.isArray(savedHotelState.progression.activeEvents)).toBe(true);
    // Every triggered event has duration >= 1; anything with duration > 1
    // must still show up with a decremented remainingDays for tomorrow.
    const multiDay = savedHotelState.progression.activeEvents.filter((event) => event.totalDays > 1);
    expect(multiDay.length).toBeGreaterThan(0);
    multiDay.forEach((event) => expect(event.remainingDays).toBeGreaterThan(0));
  });

  test("a multi-day event started yesterday continues today without needing to re-roll", async () => {
    const state = baseState();
    const day1 = await runDailyCycle({ ...state, referenceDate: REFERENCE_DATE, rng: () => 0, persist: false });
    const ongoingFromDay1 = day1.events.find((event) => event.totalDays > 1);
    expect(ongoingFromDay1).toBeDefined();

    const tomorrow = new Date(REFERENCE_DATE);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day2 = await runDailyCycle({
      ...state,
      hotelState: { ...state.hotelState, progression: { activeEvents: [ongoingFromDay1] } },
      referenceDate: tomorrow,
      rng: () => 0.999, // fires nothing new
      persist: false,
    });

    const continuing = day2.events.find((event) => event.id === ongoingFromDay1.id);
    expect(continuing).toBeDefined();
    expect(continuing.remainingDays).toBe(ongoingFromDay1.remainingDays - 1);
  });
});

describe("lib/rm integration", () => {
  test("rmReport.pricing reacts to today's active events", async () => {
    const withoutEvents = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    const withEvents = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0, persist: false });

    expect(withoutEvents.rmReport.pricing.weatherAdjustment).toBe(0);
    expect(withoutEvents.rmReport.pricing.eventAdjustment).toBe(0);
    // rng: () => 0 triggers every event, including the demand-boosting
    // local_event/vip_guest that dynamicPricing.js reacts to.
    expect(withEvents.rmReport.pricing.eventAdjustment).toBeGreaterThan(0);
  });

  test("rmReport.pickup and segmentation reflect the same reservations the rest of the cycle used", async () => {
    const report = await runDailyCycle({ ...baseState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    expect(report.rmReport.segmentation.mix.leisure).toBeGreaterThanOrEqual(0);
    expect(typeof report.rmReport.pickup.daily).toBe("object");
  });
});

describe("lib/progression integration", () => {
  // baseState() alone runs at a loss (fixed costs with no matching room
  // rate) -- these tests need a day that actually closes in the black.
  function profitableState() {
    const state = baseState();
    return { ...state, reservations: state.reservations.map((reservation) => ({ ...reservation, price: 500 })) };
  }

  test("a profitable day awards the profitable_day objective and some XP", async () => {
    const report = await runDailyCycle({ ...profitableState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    expect(report.profit).toBeGreaterThan(0);
    expect(report.progressionReport.objectivesCompleted.some((o) => o.id === "profitable_day")).toBe(true);
    expect(report.progressionReport.xp).toBeGreaterThan(0);
  });

  test("first_profit unlocks the first time a day closes with a positive profit", async () => {
    const report = await runDailyCycle({ ...profitableState(), referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    expect(report.progressionReport.newAchievements.some((a) => a.id === "first_profit")).toBe(true);
  });

  test("hotelState.progression.cycles/player are persisted for tomorrow's run", async () => {
    let savedHotelState = null;
    mockSaveDailyState.mockImplementationOnce(async ({ hotelState }) => {
      savedHotelState = hotelState;
      return { hotel: null, restaurant: null, pms: { rooms: [], reservations: [] } };
    });

    await runDailyCycle({ ...profitableState(), referenceDate: REFERENCE_DATE, rng: () => 0.999 });

    expect(savedHotelState.progression.cycles).toBe(1);
    expect(savedHotelState.progression.player).toMatchObject({
      xp: expect.any(Number),
      level: expect.any(Number),
      reputation: expect.any(Number),
      unlockedAchievements: expect.arrayContaining(["first_profit"]),
    });
  });

  test("an achievement already unlocked yesterday does not fire again today", async () => {
    const state = profitableState();
    const day1 = await runDailyCycle({ ...state, referenceDate: REFERENCE_DATE, rng: () => 0.999, persist: false });
    expect(day1.progressionReport.newAchievements.some((a) => a.id === "first_profit")).toBe(true);

    const tomorrow = new Date(REFERENCE_DATE);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day2 = await runDailyCycle({
      ...state,
      hotelState: { ...state.hotelState, progression: { cycles: 1, player: { xp: 20, level: 1, reputation: 60, unlockedAchievements: ["first_profit"] } } },
      referenceDate: tomorrow,
      rng: () => 0.999,
      persist: false,
    });

    expect(day2.progressionReport.newAchievements.some((a) => a.id === "first_profit")).toBe(false);
  });

  test("cycles increments across consecutive days instead of resetting", async () => {
    let savedHotelState = null;
    mockSaveDailyState.mockImplementation(async ({ hotelState }) => {
      savedHotelState = hotelState;
      return { hotel: null, restaurant: null, pms: { rooms: [], reservations: [] } };
    });

    const state = baseState();
    await runDailyCycle({ ...state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    expect(savedHotelState.progression.cycles).toBe(1);

    await runDailyCycle({ ...state, hotelState: savedHotelState, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    expect(savedHotelState.progression.cycles).toBe(2);
  });
});

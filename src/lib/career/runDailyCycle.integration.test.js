// Integration test: careerEngine really drives runDailyCycle() end to
// end, sandboxed (persist: false), and folds progressionEngine's own
// output (already run inside runDailyCycle) into the career's snapshot.
import { runCareerDay, startCareer } from "./careerEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseState() {
  return startCareer({
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {} },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
    },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }],
  });
}

test("runCareerDay never persists to Supabase (sandboxed, like Academy/Competition)", async () => {
  const state = baseState();
  // runDailyCycle() with persist:false never calls saveDailyState() -- if
  // this test's fixtures were wrong and persist:true, repository calls
  // would throw for lack of a configured Supabase client and this would
  // reject instead of resolving.
  await expect(runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 })).resolves.toBeDefined();
});

test("runCareerDay carries the day's real occupancy/finance into the career's hotel bundle", async () => {
  const state = baseState();
  const { state: nextState, report } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.dailyReport.hotelRevenue.occupiedRooms).toBe(1);
  expect(nextState.hotel.hotelState.finance).toBeDefined();
  expect(nextState.hotel.rooms.find((room) => room.id === 1).status).toBe("occupée");
});

test("runCareerDay's progression snapshot reflects the same progressionEngine result folded into the DailyReport", async () => {
  const state = baseState();
  const { report } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  expect(report.progression.xp).toBe(report.dailyReport.progressionReport.xp);
  expect(report.progression.level).toBe(report.dailyReport.progressionReport.level.level);
});

test("consecutive career days chain state forward the same way chainEngine/runDailyCycle already do", async () => {
  let state = baseState();
  ({ state } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
  const tomorrow = new Date(REFERENCE_DATE);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { state: dayTwoState } = await runCareerDay({ state, referenceDate: tomorrow, rng: () => 0.999 });

  expect(dayTwoState.day).toBe(2);
  expect(dayTwoState.hotel.hotelState.progression.cycles).toBe(2);
});

import {
  LEVELS,
  ROLES,
  HIRE_FEE_DAYS,
  FIRE_SEVERANCE_DAYS,
  TRAINING_COST_DAYS,
  TRAINING_DURATION_DAYS,
  dailySalaryFor,
  createEmployee,
  employeeEfficiency,
  hasRoster,
  rosterDailyPayroll,
  rosterMonthlyPayroll,
  effectiveHotelFinance,
  computeStaffing,
  staffingSatisfactionPenalty,
  cleaningDelayFactor,
  advanceRoster,
  hireEmployee,
  fireEmployee,
  trainEmployee,
  nextLevel,
  seedStarterRoster,
  MAX_ROSTER_SIZE,
} from "./staffRoster";
import { calculateExpenses } from "../dailyCycle/calculateExpenses";

const employee = (overrides = {}) => createEmployee({ id: "e1", name: "Ada", role: "housekeeping", level: "experienced", ...overrides });
const hotelWith = (staffRoster, extra = {}) => ({ staffRoster, finance: { payroll: 38000, costs: [1000, 2000] }, ...extra });
const bundleWith = (staffRoster, extra) => ({ hotelState: hotelWith(staffRoster, extra) });

describe("staffRoster / salaries and efficiency", () => {
  it("scales the daily salary with the skill level", () => {
    const base = ROLES.housekeeping.baseDailySalary;
    expect(dailySalaryFor("housekeeping", "experienced")).toBe(base);
    expect(dailySalaryFor("housekeeping", "beginner")).toBeLessThan(base);
    expect(dailySalaryFor("housekeeping", "expert")).toBeGreaterThan(base);
    expect(dailySalaryFor("nope", "expert")).toBe(0);
  });

  it("efficiency rises with skill, and falls with fatigue, low morale and training", () => {
    expect(employeeEfficiency(employee({ level: "expert" }))).toBeGreaterThan(employeeEfficiency(employee({ level: "beginner" })));
    expect(employeeEfficiency({ ...employee(), fatigue: 90 })).toBeLessThan(employeeEfficiency({ ...employee(), fatigue: 10 }));
    expect(employeeEfficiency({ ...employee(), morale: 10 })).toBeLessThan(employeeEfficiency({ ...employee(), morale: 80 }));
    expect(employeeEfficiency({ ...employee(), training: { untilDay: 9, toLevel: "expert" } })).toBeLessThan(employeeEfficiency(employee()));
  });
});

describe("staffRoster / inert without a roster", () => {
  it("has no roster, no payroll, and changes nothing", () => {
    expect(hasRoster({})).toBe(false);
    expect(rosterDailyPayroll({})).toBe(0);
    expect(computeStaffing({}, { occupiedRooms: 10 })).toBeNull();
    expect(staffingSatisfactionPenalty({})).toBe(0);
    expect(cleaningDelayFactor({})).toBe(1);
    const hotelState = { finance: { payroll: 5000 } };
    expect(effectiveHotelFinance(hotelState)).toBe(hotelState.finance);
    expect(advanceRoster(hotelState, { occupiedRooms: 5, day: 1 })).toBe(hotelState);
  });

  it("calculateExpenses is unchanged without a roster and grows by exactly the roster's daily payroll with one", () => {
    const base = { finance: { payroll: 30000, fixedCosts: 0 } };
    const without = calculateExpenses({ hotelState: base });
    const roster = [employee(), employee({ id: "e2", role: "maintenance" })];
    const withRoster = calculateExpenses({ hotelState: { ...base, staffRoster: roster } });
    expect(withRoster.total - without.total).toBe(rosterDailyPayroll({ staffRoster: roster }));
  });
});

describe("staffRoster / payroll", () => {
  it("sums daily salaries, monthly = x30, and folds them into the effective hotel payroll", () => {
    const roster = [employee(), employee({ id: "e2", level: "beginner" })];
    const daily = roster[0].dailySalary + roster[1].dailySalary;
    expect(rosterDailyPayroll({ staffRoster: roster })).toBe(daily);
    expect(rosterMonthlyPayroll({ staffRoster: roster })).toBe(daily * 30);
    expect(effectiveHotelFinance(hotelWith(roster)).payroll).toBe(38000 + daily * 30);
  });
});

describe("staffRoster / staffing coverage", () => {
  it("full coverage when there are enough housekeepers, a shortage when there aren't", () => {
    const one = hotelWith([employee()]); // 1 experienced housekeeper covers 10 rooms
    expect(computeStaffing(one, { occupiedRooms: 10 }).housekeepingCoverage).toBeCloseTo(1);
    expect(computeStaffing(one, { occupiedRooms: 20 }).housekeepingCoverage).toBeCloseTo(0.5);
  });

  it("a hotel with a roster but nobody to clean is at zero coverage; an empty hotel needs nobody", () => {
    expect(computeStaffing(hotelWith([]), { occupiedRooms: 5 }).housekeepingCoverage).toBe(0);
    expect(computeStaffing(hotelWith([]), { occupiedRooms: 0 }).housekeepingCoverage).toBe(1);
  });

  it("a shortage stretches cleaning time (capped) and costs guest satisfaction, split between housekeeping and reception", () => {
    const state = advanceRoster(hotelWith([employee()]), { occupiedRooms: 20, day: 1 });
    expect(state.staffing.cleaningDelayFactor).toBeCloseTo(2);
    expect(cleaningDelayFactor(state)).toBeCloseTo(2);
    expect(staffingSatisfactionPenalty(state)).toBeGreaterThan(0);

    const nobody = advanceRoster(hotelWith([]), { occupiedRooms: 20, day: 1 });
    expect(nobody.staffing.cleaningDelayFactor).toBe(2.5);

    // A light shortage, with reception covered, costs far less than being fully understaffed.
    const light = advanceRoster(hotelWith([employee(), employee({ id: "r", role: "reception" })]), { occupiedRooms: 12, day: 1 });
    expect(staffingSatisfactionPenalty(light)).toBeGreaterThan(0);
    expect(staffingSatisfactionPenalty(light)).toBeLessThan(staffingSatisfactionPenalty(state));
    // ...and each side is capped (housekeeping 20 + reception 8).
    expect(staffingSatisfactionPenalty(nobody)).toBe(28);
  });

  it("no penalty and no slowdown once staffed", () => {
    const state = advanceRoster(hotelWith([employee(), employee({ id: "r", role: "reception" })]), { occupiedRooms: 8, day: 1 });
    expect(staffingSatisfactionPenalty(state)).toBe(0);
    expect(cleaningDelayFactor(state)).toBe(1);
  });

  it("a better-skilled team covers more rooms", () => {
    const beginner = computeStaffing(hotelWith([employee({ level: "beginner" })]), { occupiedRooms: 10 }).housekeepingCoverage;
    const expert = computeStaffing(hotelWith([employee({ level: "expert" })]), { occupiedRooms: 10 }).housekeepingCoverage;
    expect(expert).toBeGreaterThan(beginner);
  });
});

describe("staffRoster / daily fatigue and morale", () => {
  it("an overloaded employee tires and loses morale over days; recovery follows once relieved", () => {
    let state = hotelWith([employee()]);
    for (let day = 1; day <= 8; day += 1) state = advanceRoster(state, { occupiedRooms: 30, day });
    const worn = state.staffRoster[0];
    expect(worn.fatigue).toBeGreaterThan(60);
    expect(worn.morale).toBeLessThan(70);

    for (let day = 9; day <= 20; day += 1) state = advanceRoster(state, { occupiedRooms: 2, day });
    expect(state.staffRoster[0].fatigue).toBeLessThan(worn.fatigue);
  });

  it("stays within 0..100", () => {
    let state = hotelWith([employee()]);
    for (let day = 1; day <= 60; day += 1) state = advanceRoster(state, { occupiedRooms: 200, day });
    expect(state.staffRoster[0].fatigue).toBeLessThanOrEqual(100);
    expect(state.staffRoster[0].morale).toBeGreaterThanOrEqual(0);
    for (let day = 61; day <= 200; day += 1) state = advanceRoster(state, { occupiedRooms: 0, day });
    expect(state.staffRoster[0].fatigue).toBe(0);
    expect(state.staffRoster[0].morale).toBeLessThanOrEqual(100);
  });

  it("a technician working a repair tires, an idle one does not", () => {
    const tech = employee({ id: "t1", role: "maintenance" });
    const busy = advanceRoster(hotelWith([tech], { activeIncidents: [{ id: "i", status: "repairing", handledBy: "t1" }] }), { occupiedRooms: 5, day: 1 });
    const idle = advanceRoster(hotelWith([tech]), { occupiedRooms: 5, day: 1 });
    expect(busy.staffRoster[0].fatigue).toBeGreaterThan(idle.staffRoster[0].fatigue);
  });

  it("completes a due training: higher level, higher salary, no more training flag", () => {
    let bundle = trainEmployee(bundleWith([employee()]), "e1", { day: 1 });
    expect(bundle.hotelState.staffRoster[0].training).toEqual({ untilDay: 1 + TRAINING_DURATION_DAYS, toLevel: "expert" });
    let state = bundle.hotelState;
    state = advanceRoster(state, { occupiedRooms: 5, day: 2 });
    expect(state.staffRoster[0].level).toBe("experienced"); // not yet
    state = advanceRoster(state, { occupiedRooms: 5, day: 1 + TRAINING_DURATION_DAYS });
    expect(state.staffRoster[0]).toMatchObject({ level: "expert", training: null, dailySalary: dailySalaryFor("housekeeping", "expert") });
  });
});

describe("staffRoster / hiring, firing, training", () => {
  it("hire: adds the employee and debits the recruitment fee from the current month", () => {
    const next = hireEmployee(bundleWith([]), { role: "maintenance", level: "expert", name: "Tom", day: 4 });
    const hired = next.hotelState.staffRoster[0];
    expect(hired).toMatchObject({ name: "Tom", role: "maintenance", level: "expert", hiredOnDay: 4, fatigue: 20, morale: 70, training: null });
    expect(hired.dailySalary).toBe(dailySalaryFor("maintenance", "expert"));
    expect(next.hotelState.finance.costs).toEqual([1000, 2000 + hired.dailySalary * HIRE_FEE_DAYS]);
  });

  it("hire: ids are unique and a name is generated when none is given", () => {
    let bundle = bundleWith([]);
    bundle = hireEmployee(bundle, { role: "housekeeping", day: 1 });
    bundle = hireEmployee(bundle, { role: "housekeeping", day: 1 });
    const [a, b] = bundle.hotelState.staffRoster;
    expect(a.id).not.toBe(b.id);
    expect(a.name).toEqual(expect.any(String));
  });

  it("hire: ignores an unknown role/level and a full roster", () => {
    const bundle = bundleWith([]);
    expect(hireEmployee(bundle, { role: "astronaut" })).toBe(bundle);
    expect(hireEmployee(bundle, { role: "housekeeping", level: "godlike" })).toBe(bundle);
    const full = bundleWith(Array.from({ length: MAX_ROSTER_SIZE }, (_, i) => employee({ id: `e${i}` })));
    expect(hireEmployee(full, { role: "housekeeping" })).toBe(full);
  });

  it("fire: removes the employee and debits severance", () => {
    const bundle = bundleWith([employee(), employee({ id: "e2" })]);
    const next = fireEmployee(bundle, "e1");
    expect(next.hotelState.staffRoster.map((e) => e.id)).toEqual(["e2"]);
    expect(next.hotelState.finance.costs).toEqual([1000, 2000 + employee().dailySalary * FIRE_SEVERANCE_DAYS]);
    expect(fireEmployee(bundle, "ghost")).toBe(bundle);
  });

  it("fire: a repair the employee was handling goes back to the queue", () => {
    const bundle = bundleWith([employee({ id: "t1", role: "maintenance" })], { activeIncidents: [{ id: "i", status: "repairing", handledBy: "t1", repairEtaDay: 9 }] });
    const incident = fireEmployee(bundle, "t1").hotelState.activeIncidents[0];
    expect(incident).toMatchObject({ status: "active", handledBy: null, repairEtaDay: null });
  });

  it("train: debits the training cost and starts a training; not for experts or someone already training", () => {
    const bundle = bundleWith([employee({ level: "beginner" })]);
    const next = trainEmployee(bundle, "e1", { day: 2 });
    expect(next.hotelState.finance.costs[1]).toBe(2000 + employee({ level: "beginner" }).dailySalary * TRAINING_COST_DAYS);
    expect(next.hotelState.staffRoster[0].training.toLevel).toBe("experienced");
    expect(trainEmployee(next, "e1", { day: 3 })).toBe(next);
    const expert = bundleWith([employee({ level: "expert" })]);
    expect(trainEmployee(expert, "e1")).toBe(expert);
    expect(nextLevel("expert")).toBeNull();
    expect(LEVELS.expert.rank).toBe(2);
  });

  it("never mutates its input", () => {
    const bundle = bundleWith([employee()]);
    const snapshot = JSON.stringify(bundle);
    hireEmployee(bundle, { role: "reception" });
    fireEmployee(bundle, "e1");
    trainEmployee(bundle, "e1");
    expect(JSON.stringify(bundle)).toBe(snapshot);
  });
});

describe("staffRoster / starter roster", () => {
  it("seeds a small named team while leaving total payroll exactly unchanged", () => {
    const before = { finance: { payroll: 38000 } };
    const seeded = seedStarterRoster(before);
    expect(hasRoster(seeded)).toBe(true);
    const roles = seeded.staffRoster.map((e) => e.role);
    expect(roles).toEqual(expect.arrayContaining(["housekeeping", "maintenance", "reception"]));
    expect(effectiveHotelFinance(seeded).payroll).toBe(38000);
    const monthlyBefore = 38000;
    const monthlyAfter = seeded.finance.payroll + rosterMonthlyPayroll(seeded);
    expect(monthlyAfter).toBe(monthlyBefore);
  });

  it("skips a hotel whose base payroll can't absorb it, unless forced", () => {
    const small = { finance: { payroll: 1000 } };
    expect(seedStarterRoster(small)).toBe(small);
    const forced = seedStarterRoster(small, { force: true });
    expect(hasRoster(forced)).toBe(true);
    expect(forced.finance.payroll).toBe(0);
  });

  it("never re-seeds an existing roster", () => {
    const seeded = seedStarterRoster({ finance: { payroll: 38000 } });
    expect(seedStarterRoster(seeded)).toBe(seeded);
  });
});

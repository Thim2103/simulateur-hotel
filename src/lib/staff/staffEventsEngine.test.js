import {
  DEFAULT_CONFIG,
  HIGH_FATIGUE_MORALE_LOSS,
  RESIGNATION_MORALE,
  NOTICE_DAYS,
  BONUS_COST_DAYS,
  BONUS_MORALE,
  BONUS_COOLDOWN_DAYS,
  RAISE_FACTOR,
  RAISE_COOLDOWN_DAYS,
  pseudoRandom,
  runStaffEvents,
  grantBonus,
  grantRaise,
  declineRaise,
  bonusCost,
  canGrantBonus,
  canGrantRaise,
  todaysStaffEvents,
} from "./staffEventsEngine";
import { createEmployee, employeeEfficiency, advanceRoster, computeStaffing, dailySalaryFor } from "./staffRoster";

const emp = (overrides = {}) => ({ ...createEmployee({ id: "e1", name: "Ada", role: "housekeeping", level: "experienced" }), ...overrides });
// Every random event OFF unless a test asks for it.
const QUIET = { sicknessRate: 0, expressTrainingRate: 0, raiseRequestRate: 0 };
const hotel = (roster, extra = {}) => ({ staffRoster: roster, finance: { costs: [0, 500] }, staffEventsConfig: QUIET, ...extra });
const bundle = (roster, extra) => ({ hotelState: hotel(roster, extra) });
const only = (state) => state.staffRoster[0];

describe("staffEventsEngine / pseudoRandom", () => {
  it("is deterministic and within [0, 1)", () => {
    expect(pseudoRandom("a:1:sick")).toBe(pseudoRandom("a:1:sick"));
    for (let i = 0; i < 200; i += 1) {
      const value = pseudoRandom(`e${i}:${i}:sick`);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("spreads roughly evenly (so a 3% rate really is ~3%)", () => {
    const hits = Array.from({ length: 5000 }, (_, i) => pseudoRandom(`emp:${i}:sick`)).filter((v) => v < 0.03).length;
    expect(hits).toBeGreaterThan(80);
    expect(hits).toBeLessThan(230);
  });

  it("differs between employees, days and event kinds", () => {
    expect(pseudoRandom("a:1:sick")).not.toBe(pseudoRandom("b:1:sick"));
    expect(pseudoRandom("a:1:sick")).not.toBe(pseudoRandom("a:2:sick"));
    expect(pseudoRandom("a:1:sick")).not.toBe(pseudoRandom("a:1:raise"));
  });
});

describe("staffEventsEngine / inert cases", () => {
  it("does nothing without a roster", () => {
    const state = { finance: {} };
    expect(runStaffEvents(state, { day: 3 })).toBe(state);
  });

  it("does nothing at all when disabled, even for a broken employee", () => {
    const state = hotel([emp({ morale: 2, fatigue: 100 })], { staffEventsConfig: { ...QUIET, enabled: false } });
    const next = runStaffEvents(state, { day: 3 });
    expect(next.staffRoster).toHaveLength(1);
    expect(next.staffEventLog).toEqual([]);
  });

  it("leaves a healthy team exactly as it was", () => {
    const state = hotel([emp({ morale: 70, fatigue: 20 })]);
    const next = runStaffEvents(state, { day: 3 });
    expect(only(next)).toMatchObject({ morale: 70, fatigue: 20 });
    expect(next.staffEventLog).toEqual([]);
  });
});

describe("staffEventsEngine / exhaustion crushes morale", () => {
  it("one exhausted day costs nothing extra; from the second consecutive day morale drops drastically", () => {
    let state = hotel([emp({ fatigue: 90, morale: 70 })]);
    state = runStaffEvents(state, { day: 1 });
    expect(only(state).highFatigueDays).toBe(1);
    expect(only(state).morale).toBe(70);
    state = runStaffEvents(state, { day: 2 });
    expect(only(state).highFatigueDays).toBe(2);
    expect(only(state).morale).toBe(70 - HIGH_FATIGUE_MORALE_LOSS);
  });

  it("the streak resets as soon as they get some rest", () => {
    let state = hotel([emp({ fatigue: 90, morale: 70 })]);
    state = runStaffEvents(state, { day: 1 });
    state = runStaffEvents({ ...state, staffRoster: [{ ...only(state), fatigue: 50 }] }, { day: 2 });
    expect(only(state).highFatigueDays).toBe(0);
    expect(only(state).morale).toBe(70);
  });

  it("morale never goes below 0", () => {
    let state = hotel([emp({ fatigue: 100, morale: 12, highFatigueDays: 5, resignation: { noticeUntilDay: 99 } })]);
    state = runStaffEvents(state, { day: 1 });
    expect(state.staffRoster.every((e) => e.morale >= 0)).toBe(true);
  });
});

describe("staffEventsEngine / resignations", () => {
  it("below the critical morale, an employee gives notice and the player is told", () => {
    const state = runStaffEvents(hotel([emp({ morale: RESIGNATION_MORALE - 1 })]), { day: 4 });
    expect(only(state).resignation).toEqual({ noticeUntilDay: 4 + NOTICE_DAYS });
    expect(state.staffEventLog[0]).toMatchObject({ type: "resignation-notice", day: 4, employeeName: "Ada" });
    expect(state.staffEventLog[0].message).toMatch(/préavis/i);
  });

  it("they keep working during the notice, then leave when it ends", () => {
    let state = runStaffEvents(hotel([emp({ morale: 10 })]), { day: 4 });
    state = runStaffEvents(state, { day: 5 });
    expect(state.staffRoster).toHaveLength(1);
    state = runStaffEvents(state, { day: 4 + NOTICE_DAYS });
    expect(state.staffRoster).toHaveLength(0);
    expect(state.staffEventLog.map((e) => e.type)).toEqual(["resignation-notice", "resigned"]);
  });

  it("at rock-bottom morale they leave immediately", () => {
    const state = runStaffEvents(hotel([emp({ morale: 3 })]), { day: 4 });
    expect(state.staffRoster).toHaveLength(0);
    expect(state.staffEventLog[0]).toMatchObject({ type: "resigned" });
  });

  it("a notice is withdrawn if morale recovers before it ends", () => {
    let state = runStaffEvents(hotel([emp({ morale: 10 })]), { day: 4 });
    state = { ...state, staffRoster: [{ ...only(state), morale: 40 }] };
    state = runStaffEvents(state, { day: 5 });
    expect(only(state).resignation).toBeNull();
    expect(state.staffEventLog.map((e) => e.type)).toContain("resignation-withdrawn");
    state = runStaffEvents(state, { day: 4 + NOTICE_DAYS });
    expect(state.staffRoster).toHaveLength(1);
  });

  it("a departure hands the repair they were handling back to the queue", () => {
    const tech = emp({ id: "t1", role: "maintenance", morale: 2 });
    const state = runStaffEvents(hotel([tech], { activeIncidents: [{ id: "i", status: "repairing", handledBy: "t1", repairEtaDay: 9 }] }), { day: 4 });
    expect(state.activeIncidents[0]).toMatchObject({ status: "active", handledBy: null, repairEtaDay: null });
  });

  it("only the unhappy one leaves; a leaver reduces coverage", () => {
    const state = runStaffEvents(hotel([emp({ id: "a", morale: 2 }), emp({ id: "b", morale: 80 })]), { day: 4 });
    expect(state.staffRoster.map((e) => e.id)).toEqual(["b"]);
    expect(computeStaffing(state, { occupiedRooms: 20 }).housekeepingCoverage).toBeCloseTo(0.5);
  });

  it("a sustained overload ends in a resignation over enough days", () => {
    let state = hotel([emp()]);
    let resignedOn = null;
    for (let day = 1; day <= 60 && resignedOn === null; day += 1) {
      state = advanceRoster(state, { occupiedRooms: 60, day });
      state = runStaffEvents(state, { day });
      if (state.staffRoster.length === 0) resignedOn = day;
    }
    expect(resignedOn).not.toBeNull();
    expect(state.staffEventLog.map((e) => e.type)).toEqual(["resignation-notice", "resigned"]);
  });

  it("a well-staffed team never resigns, however long it plays", () => {
    let state = hotel([emp(), emp({ id: "b" })]);
    for (let day = 1; day <= 60; day += 1) {
      state = advanceRoster(state, { occupiedRooms: 10, day });
      state = runStaffEvents(state, { day });
    }
    expect(state.staffRoster).toHaveLength(2);
    expect(state.staffEventLog).toEqual([]);
  });
});

describe("staffEventsEngine / random HR events (forced through config)", () => {
  it("sick leave: set for exactly one day, the person covers nothing that day, then returns", () => {
    let state = hotel([emp()], { staffEventsConfig: { ...QUIET, sicknessRate: 1 } });
    state = runStaffEvents(state, { day: 3 });
    expect(only(state)).toMatchObject({ sick: true, sickUntilDay: 4 });
    expect(employeeEfficiency(only(state))).toBe(0);
    expect(computeStaffing(state, { occupiedRooms: 5 }).housekeepingCoverage).toBe(0);
    expect(state.staffEventLog[0]).toMatchObject({ type: "sick", day: 3 });

    state = { ...state, staffEventsConfig: QUIET };
    state = runStaffEvents(state, { day: 4 });
    expect(only(state).sick).toBe(false);
    expect(employeeEfficiency(only(state))).toBeGreaterThan(0);
  });

  it("sickness never strikes someone already off sick, and is more likely when worn out", () => {
    const state = hotel([emp({ sick: true, sickUntilDay: 9 })], { staffEventsConfig: { ...QUIET, sicknessRate: 1 } });
    expect(runStaffEvents(state, { day: 3 }).staffEventLog).toEqual([]);

    const rested = Array.from({ length: 400 }, (_, i) => runStaffEvents(hotel([emp({ id: `r${i}`, fatigue: 10 })], { staffEventsConfig: { ...QUIET, sicknessRate: DEFAULT_CONFIG.sicknessRate } }), { day: 7 })).filter((s) => only(s).sick).length;
    const worn = Array.from({ length: 400 }, (_, i) => runStaffEvents(hotel([emp({ id: `r${i}`, fatigue: 75 })], { staffEventsConfig: { ...QUIET, sicknessRate: DEFAULT_CONFIG.sicknessRate } }), { day: 7 })).filter((s) => only(s).sick).length;
    expect(worn).toBeGreaterThan(rested);
  });

  it("express training: an ongoing training is brought forward to finish tomorrow", () => {
    let state = hotel([emp({ training: { untilDay: 9, toLevel: "expert" } })], { staffEventsConfig: { ...QUIET, expressTrainingRate: 1 } });
    state = runStaffEvents(state, { day: 3 });
    expect(only(state).training.untilDay).toBe(3);
    expect(state.staffEventLog[0].type).toBe("express-training");
    const promoted = advanceRoster(state, { occupiedRooms: 5, day: 4 });
    expect(only(promoted)).toMatchObject({ level: "expert", training: null });
  });

  it("express training only concerns someone actually in training", () => {
    const state = hotel([emp()], { staffEventsConfig: { ...QUIET, expressTrainingRate: 1 } });
    expect(runStaffEvents(state, { day: 3 }).staffEventLog).toEqual([]);
  });

  it("raise request: an unhappy employee asks, and an unanswered request keeps eating morale", () => {
    let state = hotel([emp({ morale: 40 })], { staffEventsConfig: { ...QUIET, raiseRequestRate: 1 } });
    state = runStaffEvents(state, { day: 3 });
    expect(only(state).raiseRequested).toBe(true);
    expect(state.staffEventLog[0]).toMatchObject({ type: "raise-request" });
    state = { ...state, staffEventsConfig: QUIET };
    const before = only(state).morale;
    state = runStaffEvents(state, { day: 4 });
    expect(only(state).morale).toBeLessThan(before);
  });

  it("nobody asks while content, right after a raise, or twice", () => {
    const rate1 = { ...QUIET, raiseRequestRate: 1 };
    expect(runStaffEvents(hotel([emp({ morale: 80 })], { staffEventsConfig: rate1 }), { day: 3 }).staffEventLog).toEqual([]);
    expect(runStaffEvents(hotel([emp({ morale: 40, lastRaiseDay: 1 })], { staffEventsConfig: rate1 }), { day: 3 }).staffEventLog).toEqual([]);
    expect(runStaffEvents(hotel([emp({ morale: 40, raiseRequested: true })], { staffEventsConfig: rate1 }), { day: 3 }).staffEventLog.filter((e) => e.type === "raise-request")).toEqual([]);
  });

  it("with default rates and the same career, the same days give the same events (reproducible)", () => {
    const run = () => {
      let state = { staffRoster: [emp({ id: "x" }), emp({ id: "y", role: "reception" })], finance: { costs: [0] } };
      for (let day = 1; day <= 120; day += 1) state = runStaffEvents(state, { day });
      return state.staffEventLog.map((e) => e.id);
    };
    expect(run()).toEqual(run());
    expect(run().length).toBeGreaterThan(0); // 2 people over 120 days at 3% does produce some sick leave
  });

  it("the log is idempotent per event, capped, and 'todaysStaffEvents' filters by day", () => {
    const forced = hotel([emp()], { staffEventsConfig: { ...QUIET, sicknessRate: 1 } });
    const once = runStaffEvents(forced, { day: 3 });
    const twice = runStaffEvents({ ...once, staffRoster: [{ ...only(once), sick: false }] }, { day: 3 });
    expect(twice.staffEventLog).toHaveLength(1);
    expect(todaysStaffEvents(once, 3)).toHaveLength(1);
    expect(todaysStaffEvents(once, 4)).toEqual([]);

    let state = hotel([emp()], { staffEventsConfig: { ...QUIET, sicknessRate: 1 } });
    for (let day = 1; day <= 80; day += 2) {
      state = runStaffEvents({ ...state, staffRoster: [{ ...only(state), sick: false }] }, { day });
    }
    expect(state.staffEventLog.length).toBeLessThanOrEqual(30);
  });
});

describe("staffEventsEngine / bonus and raise", () => {
  it("bonus: debits days of salary, lifts morale, and lifts a notice once morale is back", () => {
    const start = emp({ morale: 10, resignation: { noticeUntilDay: 9 } });
    const next = grantBonus(bundle([start]), "e1", { day: 5 });
    expect(next.hotelState.finance.costs).toEqual([0, 500 + start.dailySalary * BONUS_COST_DAYS]);
    expect(bonusCost(start)).toBe(start.dailySalary * BONUS_COST_DAYS);
    expect(next.hotelState.staffRoster[0]).toMatchObject({ morale: 10 + BONUS_MORALE, resignation: null, lastBonusDay: 5 });
  });

  it("bonus: a notice stays if the boost isn't enough to clear the recovery bar", () => {
    const next = grantBonus(bundle([emp({ morale: 2, resignation: { noticeUntilDay: 9 } })]), "e1", { day: 5 });
    expect(next.hotelState.staffRoster[0].resignation).toEqual({ noticeUntilDay: 9 });
  });

  it("bonus: once a week per person", () => {
    const first = grantBonus(bundle([emp({ morale: 40 })]), "e1", { day: 5 });
    expect(grantBonus(first, "e1", { day: 5 + BONUS_COOLDOWN_DAYS - 1 })).toBe(first);
    expect(grantBonus(first, "e1", { day: 5 + BONUS_COOLDOWN_DAYS })).not.toBe(first);
    expect(canGrantBonus(emp({ lastBonusDay: 5 }), 6)).toBe(false);
    expect(canGrantBonus(emp(), 0)).toBe(true);
  });

  it("morale is capped at 100", () => {
    expect(grantBonus(bundle([emp({ morale: 95 })]), "e1", { day: 1 }).hotelState.staffRoster[0].morale).toBe(100);
  });

  it("raise: permanent +10% salary, morale up, request answered, cooldown set", () => {
    const start = emp({ morale: 40, raiseRequested: true });
    const next = grantRaise(bundle([start]), "e1", { day: 5 }).hotelState.staffRoster[0];
    expect(next.dailySalary).toBe(Math.round(start.dailySalary * RAISE_FACTOR));
    expect(next).toMatchObject({ raiseRequested: false, lastRaiseDay: 5 });
    expect(next.morale).toBeGreaterThan(40);
    expect(next.raiseFactor).toBeCloseTo(RAISE_FACTOR);
  });

  it("raise: costs nothing up front but raises the roster's payroll for good", () => {
    const start = bundle([emp()]);
    const next = grantRaise(start, "e1", { day: 5 });
    expect(next.hotelState.finance.costs).toEqual(start.hotelState.finance.costs);
    expect(next.hotelState.staffRoster[0].dailySalary).toBeGreaterThan(start.hotelState.staffRoster[0].dailySalary);
  });

  it("raise: once every two weeks, and the raise survives a promotion", () => {
    const first = grantRaise(bundle([emp()]), "e1", { day: 5 });
    expect(grantRaise(first, "e1", { day: 5 + RAISE_COOLDOWN_DAYS - 1 })).toBe(first);
    expect(canGrantRaise(first.hotelState.staffRoster[0], 5 + RAISE_COOLDOWN_DAYS)).toBe(true);

    const withTraining = { hotelState: { ...first.hotelState, staffRoster: [{ ...first.hotelState.staffRoster[0], training: { untilDay: 6, toLevel: "expert" } }] } };
    const promoted = advanceRoster(withTraining.hotelState, { occupiedRooms: 5, day: 6 }).staffRoster[0];
    expect(promoted.level).toBe("expert");
    expect(promoted.dailySalary).toBe(Math.round(dailySalaryFor("housekeeping", "expert") * RAISE_FACTOR));
  });

  it("decline: settles the request at a morale price; no-op without one", () => {
    const asked = bundle([emp({ morale: 40, raiseRequested: true })]);
    const declined = declineRaise(asked, "e1").hotelState.staffRoster[0];
    expect(declined.raiseRequested).toBe(false);
    expect(declined.morale).toBeLessThan(40);
    const noRequest = bundle([emp()]);
    expect(declineRaise(noRequest, "e1")).toBe(noRequest);
  });

  it("all three ignore an unknown employee and never mutate their input", () => {
    const start = bundle([emp({ raiseRequested: true })]);
    const snapshot = JSON.stringify(start);
    expect(grantBonus(start, "ghost")).toBe(start);
    expect(grantRaise(start, "ghost")).toBe(start);
    expect(declineRaise(start, "ghost")).toBe(start);
    grantBonus(start, "e1", { day: 1 });
    grantRaise(start, "e1", { day: 1 });
    declineRaise(start, "e1");
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

import {
  computeWorkload,
  computeCleaningTime,
  computeHousekeepingProductivity,
  computeHousekeeperCount,
  detectOverload,
  detectUnderstaffing,
  costOfHousekeeping,
  resolveHousekeepingSettings,
} from "./housekeepingCalculations";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function room(overrides = {}) {
  return { id: 1, number: "101", status: "occupée", housekeeping_status: "clean", ...overrides };
}

function reservation(overrides = {}) {
  return { room_id: 1, status: "confirmée", arrival: "2026-09-09", departure: "2026-09-10", ...overrides };
}

describe("computeWorkload", () => {
  test("counts a checked-out room as needing a clean today", () => {
    const workload = computeWorkload({ rooms: [room()], reservations: [reservation({ departure: "2026-09-10" })], referenceDate: REFERENCE_DATE });
    expect(workload.roomsToClean).toBe(1);
    expect(workload.priorities.departures).toBe(1);
  });

  test("classifies arrivals/departures/stayovers correctly", () => {
    const rooms = [room({ id: 1 }), room({ id: 2 }), room({ id: 3 })];
    const reservations = [
      reservation({ room_id: 1, arrival: "2026-09-10", departure: "2026-09-13" }), // arrival today
      reservation({ room_id: 2, arrival: "2026-09-08", departure: "2026-09-10" }), // departure today
      reservation({ room_id: 3, arrival: "2026-09-08", departure: "2026-09-13" }), // stayover
    ];
    const workload = computeWorkload({ rooms, reservations, referenceDate: REFERENCE_DATE });
    expect(workload.priorities.arrivals).toBe(1);
    expect(workload.priorities.departures).toBe(1);
    expect(workload.priorities.stayovers).toBe(1);
  });

  test("ignores cancelled reservations", () => {
    const workload = computeWorkload({ rooms: [room()], reservations: [reservation({ status: "annulée", departure: "2026-09-10" })], referenceDate: REFERENCE_DATE });
    expect(workload.priorities.departures).toBe(0);
  });

  test("safe on empty input", () => {
    expect(() => computeWorkload({})).not.toThrow();
  });
});

describe("computeCleaningTime", () => {
  test("more rooms means more total minutes", () => {
    const small = computeCleaningTime({ roomsToClean: 2, stayovers: 0 });
    const large = computeCleaningTime({ roomsToClean: 10, stayovers: 0 });
    expect(large.totalMinutes).toBeGreaterThan(small.totalMinutes);
  });

  test("higher training/process efficiency speeds up cleaning", () => {
    const slow = computeCleaningTime({ roomsToClean: 5, stayovers: 0, trainingLevel: 20, processEfficiency: 20 });
    const fast = computeCleaningTime({ roomsToClean: 5, stayovers: 0, trainingLevel: 90, processEfficiency: 90 });
    expect(fast.totalMinutes).toBeLessThan(slow.totalMinutes);
  });

  test("stayovers add less time than deep cleans", () => {
    const deepCleans = computeCleaningTime({ roomsToClean: 5, stayovers: 0 });
    const stayovers = computeCleaningTime({ roomsToClean: 0, stayovers: 5 });
    expect(stayovers.totalMinutes).toBeLessThan(deepCleans.totalMinutes);
  });
});

describe("computeHousekeepingProductivity", () => {
  test("blends staff productivity and training", () => {
    const productivity = computeHousekeepingProductivity({ staffProductivity: 80, staffOverload: 50, trainingLevel: 80 });
    expect(productivity).toBeGreaterThan(60);
  });

  test("overload penalizes productivity", () => {
    const normal = computeHousekeepingProductivity({ staffProductivity: 70, staffOverload: 60, trainingLevel: 60 });
    const overloaded = computeHousekeepingProductivity({ staffProductivity: 70, staffOverload: 200, trainingLevel: 60 });
    expect(overloaded).toBeLessThan(normal);
  });

  test("stays within 0-100", () => {
    expect(computeHousekeepingProductivity({ staffProductivity: 1000, staffOverload: 0, trainingLevel: 1000 })).toBeLessThanOrEqual(100);
    expect(computeHousekeepingProductivity({ staffProductivity: 0, staffOverload: 900, trainingLevel: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe("computeHousekeeperCount", () => {
  test("scales with hotel headcount and staffingBonus", () => {
    expect(computeHousekeeperCount({ hotelHeadcount: 15, staffingBonus: 0 })).toBe(6); // round(15*0.4)
    expect(computeHousekeeperCount({ hotelHeadcount: 15, staffingBonus: 2 })).toBe(8);
  });

  test("never below 1", () => {
    expect(computeHousekeeperCount({ hotelHeadcount: 0, staffingBonus: 0 })).toBe(1);
  });
});

describe("detectOverload", () => {
  test("rises with more cleaning minutes relative to the team's shift capacity", () => {
    const low = detectOverload({ totalMinutes: 100, housekeeperCount: 5 });
    const high = detectOverload({ totalMinutes: 5000, housekeeperCount: 1 });
    expect(high).toBeGreaterThan(low);
  });
});

describe("detectUnderstaffing", () => {
  test("flags understaffing when rooms exceed effective capacity", () => {
    const result = detectUnderstaffing({ roomsToClean: 100, housekeeperCount: 1, staffAbsenteeism: 0 });
    expect(result.understaffed).toBe(true);
    expect(result.shortfall).toBeGreaterThan(0);
  });

  test("absenteeism reduces effective capacity", () => {
    const noAbsenteeism = detectUnderstaffing({ roomsToClean: 10, housekeeperCount: 1, staffAbsenteeism: 0 });
    const highAbsenteeism = detectUnderstaffing({ roomsToClean: 10, housekeeperCount: 1, staffAbsenteeism: 80 });
    expect(highAbsenteeism.effectiveCapacity).toBeLessThan(noAbsenteeism.effectiveCapacity);
  });

  test("not understaffed with ample capacity", () => {
    const result = detectUnderstaffing({ roomsToClean: 2, housekeeperCount: 5, staffAbsenteeism: 0 });
    expect(result.understaffed).toBe(false);
    expect(result.shortfall).toBe(0);
  });
});

describe("costOfHousekeeping", () => {
  test("scales with housekeeper count", () => {
    expect(costOfHousekeeping({ housekeeperCount: 2, averageHotelStaffSalary: 2600 })).toBe(5200);
  });
});

describe("resolveHousekeepingSettings", () => {
  test("falls back to sensible defaults when hotelState.housekeeping is missing", () => {
    const settings = resolveHousekeepingSettings({});
    expect(settings).toEqual({ staffingBonus: 0, trainingLevel: 50, processEfficiency: 50 });
  });

  test("reads explicit values when present", () => {
    const settings = resolveHousekeepingSettings({ housekeeping: { staffingBonus: 2, trainingLevel: 80, processEfficiency: 70 } });
    expect(settings).toEqual({ staffingBonus: 2, trainingLevel: 80, processEfficiency: 70 });
  });
});

import {
  computeAbsenteeism,
  computeHeadcount,
  computeMorale,
  computeOverload,
  computePayrollCost,
  computeProductivity,
  computeTurnover,
} from "./staffCalculations";

describe("computeHeadcount", () => {
  test("estimates hotel headcount from payroll and counts the real restaurant roster", () => {
    const headcount = computeHeadcount({ hotelFinance: { payroll: 26000 }, restaurantStaff: [{ id: 1 }, { id: 2 }] });
    expect(headcount.hotel).toBe(10); // 26000 / 2600
    expect(headcount.restaurant).toBe(2);
    expect(headcount.total).toBe(12);
  });

  test("never negative/NaN on empty input", () => {
    const headcount = computeHeadcount({});
    expect(headcount).toEqual({ hotel: 0, restaurant: 0, total: 0 });
  });
});

describe("computeMorale", () => {
  test("blends restaurant staff satisfaction with ESG wellbeing", () => {
    const morale = computeMorale({ restaurantStaff: [{ satisfaction: 80 }, { satisfaction: 60 }], staffWellbeing: 90 });
    // teamSatisfaction = 70, wellbeing = 90 -> 70*0.6 + 90*0.4 = 78
    expect(morale).toBe(78);
  });

  test("falls back to plausible defaults with no data", () => {
    const morale = computeMorale({});
    expect(morale).toBeGreaterThan(0);
    expect(morale).toBeLessThanOrEqual(100);
  });

  test("stays within 0-100", () => {
    const morale = computeMorale({ restaurantStaff: [{ satisfaction: 200 }], staffWellbeing: 200 });
    expect(morale).toBeLessThanOrEqual(100);
  });
});

describe("computeOverload", () => {
  test("reports low load for a well-staffed small hotel", () => {
    const headcount = { hotel: 5, restaurant: 6 };
    const { overload, housekeepingLoad, serviceLoad } = computeOverload({ roomCount: 10, restaurantSeats: 40, headcount });
    expect(overload).toBeLessThan(100);
    expect(housekeepingLoad).toBeGreaterThanOrEqual(0);
    expect(serviceLoad).toBeGreaterThanOrEqual(0);
  });

  test("flags overload when rooms/covers far exceed nominal capacity", () => {
    const headcount = { hotel: 1, restaurant: 1 };
    const { overload } = computeOverload({ roomCount: 200, restaurantSeats: 200, headcount });
    expect(overload).toBeGreaterThan(100);
  });

  test("never divides by zero with an empty team", () => {
    expect(() => computeOverload({ roomCount: 10, restaurantSeats: 10, headcount: { hotel: 0, restaurant: 0 } })).not.toThrow();
  });
});

describe("computeAbsenteeism", () => {
  test("stays near baseline at high morale and low overload", () => {
    const absenteeism = computeAbsenteeism({ morale: 90, overload: 50 });
    expect(absenteeism).toBeLessThanOrEqual(10);
  });

  test("rises with low morale and heavy overload", () => {
    const low = computeAbsenteeism({ morale: 90, overload: 50 });
    const high = computeAbsenteeism({ morale: 20, overload: 160 });
    expect(high).toBeGreaterThan(low);
  });

  test("stays within 0-40", () => {
    const absenteeism = computeAbsenteeism({ morale: 0, overload: 500 });
    expect(absenteeism).toBeLessThanOrEqual(40);
    expect(absenteeism).toBeGreaterThanOrEqual(0);
  });
});

describe("computeProductivity", () => {
  test("uses the real team average when available", () => {
    const productivity = computeProductivity({ restaurantStaff: [{ productivity: 80 }, { productivity: 90 }], overload: 50 });
    expect(productivity).toBe(85);
  });

  test("is penalized by sustained overload", () => {
    const normal = computeProductivity({ restaurantStaff: [{ productivity: 80 }], overload: 60 });
    const overloaded = computeProductivity({ restaurantStaff: [{ productivity: 80 }], overload: 180 });
    expect(overloaded).toBeLessThan(normal);
  });
});

describe("computeTurnover", () => {
  test("stays at baseline when morale is high and no one left", () => {
    const turnover = computeTurnover({ morale: 90, overload: 60, departuresLast: 0, headcount: { total: 10 } });
    expect(turnover.estimatedRate).toBeLessThanOrEqual(5);
    expect(turnover.actualRateLastCycle).toBe(0);
  });

  test("reflects real departures from the last cycle", () => {
    const turnover = computeTurnover({ morale: 60, overload: 80, departuresLast: 2, headcount: { total: 10 } });
    expect(turnover.departuresLast).toBe(2);
    expect(turnover.actualRateLastCycle).toBe(20);
  });

  test("rises with low morale and heavy overload", () => {
    const low = computeTurnover({ morale: 90, overload: 50, departuresLast: 0, headcount: { total: 10 } });
    const high = computeTurnover({ morale: 10, overload: 200, departuresLast: 0, headcount: { total: 10 } });
    expect(high.estimatedRate).toBeGreaterThan(low.estimatedRate);
  });
});

describe("computePayrollCost", () => {
  test("sums hotel and restaurant payroll", () => {
    const payroll = computePayrollCost({ hotelFinance: { payroll: 38000 }, restaurantFinance: { payroll: 9800 } });
    expect(payroll).toEqual({ hotel: 38000, restaurant: 9800, total: 47800 });
  });

  test("never negative/NaN on empty input", () => {
    expect(computePayrollCost({})).toEqual({ hotel: 0, restaurant: 0, total: 0 });
  });
});

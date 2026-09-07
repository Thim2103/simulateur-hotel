import { computeStaffProductivity, computeStaffSatisfactionAvg, headcount } from "./restaurantStaff";

test("computeStaffProductivity increases with total payroll, within bounds", () => {
  const small = [{ salary: 2000 }];
  const large = [{ salary: 2000 }, { salary: 4000 }, { salary: 4200 }];
  expect(computeStaffProductivity(large, { complaints: 0 })).toBeGreaterThan(computeStaffProductivity(small, { complaints: 0 }));
  expect(computeStaffProductivity(large, { complaints: 0 })).toBeLessThanOrEqual(98);
});

test("computeStaffProductivity is penalized by complaints", () => {
  const staff = [{ salary: 3000 }];
  expect(computeStaffProductivity(staff, { complaints: 5 })).toBeLessThan(computeStaffProductivity(staff, { complaints: 0 }));
});

test("computeStaffSatisfactionAvg is null when nobody has a recorded satisfaction", () => {
  expect(computeStaffSatisfactionAvg([{ name: "Ada" }])).toBeNull();
  expect(computeStaffSatisfactionAvg([])).toBeNull();
});

test("computeStaffSatisfactionAvg averages only staff with a recorded satisfaction", () => {
  const staff = [{ satisfaction: 80 }, { satisfaction: 60 }, { name: "no score yet" }];
  expect(computeStaffSatisfactionAvg(staff)).toBe(70);
});

test("headcount counts the staff array, defensively", () => {
  expect(headcount([{ id: 1 }, { id: 2 }])).toBe(2);
  expect(headcount(null)).toBe(0);
});

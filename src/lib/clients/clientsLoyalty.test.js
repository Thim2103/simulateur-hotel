import { computeLoyalty, loyaltyGrade } from "./clientsLoyalty";

test("starts near 50 on day 1 (no previousLoyalty)", () => {
  const l = computeLoyalty({ satisfaction: 65 });
  expect(l).toBeGreaterThan(40);
  expect(l).toBeLessThan(70);
});

test("loyalty is higher when satisfaction is consistently high", () => {
  // Simulate several cycles
  let loyalty = null;
  for (let i = 0; i < 5; i += 1) {
    loyalty = computeLoyalty({ satisfaction: 90, previousLoyalty: loyalty });
  }
  expect(loyalty).toBeGreaterThan(70);
});

test("loyalty decays when satisfaction falls below 50", () => {
  const high = computeLoyalty({ satisfaction: 20, previousLoyalty: 80 });
  const low = computeLoyalty({ satisfaction: 80, previousLoyalty: 80 });
  expect(high).toBeLessThan(low);
});

test("loyalty is clamped between 0 and 100", () => {
  const max = computeLoyalty({ satisfaction: 100, previousLoyalty: 100 });
  const min = computeLoyalty({ satisfaction: 0, previousLoyalty: 0 });
  expect(max).toBeLessThanOrEqual(100);
  expect(min).toBeGreaterThanOrEqual(0);
});

test("premium segment boosts loyalty slightly", () => {
  const noPremium = computeLoyalty({ satisfaction: 70, previousLoyalty: 60, segments: { premium: 5, leisure: 70, business: 15, famille: 10 } });
  const withPremium = computeLoyalty({ satisfaction: 70, previousLoyalty: 60, segments: { premium: 30, leisure: 40, business: 15, famille: 15 } });
  expect(withPremium).toBeGreaterThanOrEqual(noPremium);
});

test("loyaltyGrade returns correct label", () => {
  expect(loyaltyGrade(90)).toBe("Fidèles ambassadeurs");
  expect(loyaltyGrade(72)).toBe("Clients réguliers");
  expect(loyaltyGrade(57)).toBe("En cours de fidélisation");
  expect(loyaltyGrade(42)).toBe("Occasionnels");
  expect(loyaltyGrade(20)).toBe("Clientèle volatile");
});

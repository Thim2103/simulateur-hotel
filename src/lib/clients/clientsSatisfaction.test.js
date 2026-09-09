import { computeSatisfaction, satisfactionToStars, restaurantRatingToScore, SATISFACTION_WEIGHTS } from "./clientsSatisfaction";

test("returns 65 baseline when no module inputs are available", () => {
  expect(computeSatisfaction()).toBe(65);
});

test("returns 100 when all inputs are 100", () => {
  expect(
    computeSatisfaction({
      housekeepingQuality: 100,
      staffMorale: 100,
      rmSatisfaction: 100,
      restaurantSatisfaction: 100,
      esgScore: 100,
      marketingReputation: 100,
    })
  ).toBe(100);
});

test("returns 0 when all inputs are 0", () => {
  expect(
    computeSatisfaction({
      housekeepingQuality: 0,
      staffMorale: 0,
      rmSatisfaction: 0,
      restaurantSatisfaction: 0,
      esgScore: 0,
      marketingReputation: 0,
    })
  ).toBe(0);
});

test("null inputs are excluded from the weighted average", () => {
  // Only housekeeping at 80 → result should be 80
  const result = computeSatisfaction({ housekeepingQuality: 80 });
  expect(result).toBe(80);
});

test("weights sum to 1.0", () => {
  const total = Object.values(SATISFACTION_WEIGHTS).reduce((a, b) => a + b, 0);
  expect(Math.round(total * 100) / 100).toBe(1);
});

test("housekeeping has the highest weight", () => {
  expect(SATISFACTION_WEIGHTS.housekeeping).toBeGreaterThan(SATISFACTION_WEIGHTS.staff);
  expect(SATISFACTION_WEIGHTS.housekeeping).toBeGreaterThan(SATISFACTION_WEIGHTS.rm);
});

test("satisfactionToStars converts 100 to 5.0", () => {
  expect(satisfactionToStars(100)).toBe(5);
});

test("satisfactionToStars converts 0 to 1.0", () => {
  expect(satisfactionToStars(0)).toBe(1);
});

test("restaurantRatingToScore converts 5 stars to 100", () => {
  expect(restaurantRatingToScore(5)).toBe(100);
});

test("restaurantRatingToScore converts 1 star to 0", () => {
  expect(restaurantRatingToScore(1)).toBe(0);
});

test("restaurantRatingToScore returns null for 0 or null input", () => {
  expect(restaurantRatingToScore(0)).toBeNull();
  expect(restaurantRatingToScore(null)).toBeNull();
});

import { computeReviews } from "./clientsReviews";

test("avgRating increases with higher satisfaction", () => {
  const low = computeReviews({ satisfaction: 20 });
  const high = computeReviews({ satisfaction: 90 });
  expect(high.avgRating).toBeGreaterThan(low.avgRating);
});

test("avgRating is between 1 and 5", () => {
  const r = computeReviews({ satisfaction: 50 });
  expect(r.avgRating).toBeGreaterThanOrEqual(1);
  expect(r.avgRating).toBeLessThanOrEqual(5);
});

test("positive rate is higher when satisfaction is high", () => {
  const low = computeReviews({ satisfaction: 20 });
  const high = computeReviews({ satisfaction: 90 });
  expect(high.positive).toBeGreaterThan(low.positive);
});

test("negative rate is lower when satisfaction is high", () => {
  const low = computeReviews({ satisfaction: 20 });
  const high = computeReviews({ satisfaction: 90 });
  expect(high.negative).toBeLessThan(low.negative);
});

test("trend is 'improving' when rating grew", () => {
  const prev = { avgRating: 3.0, count: 10, positive: 60, negative: 15 };
  const result = computeReviews({ satisfaction: 90, previousReviews: prev });
  expect(result.trend).toBe("improving");
});

test("trend is 'declining' when rating dropped", () => {
  const prev = { avgRating: 4.8, count: 100, positive: 95, negative: 2 };
  const result = computeReviews({ satisfaction: 20, previousReviews: prev });
  expect(result.trend).toBe("declining");
});

test("count grows each cycle", () => {
  const prev = { avgRating: 4.0, count: 50, positive: 80, negative: 10, trend: "stable" };
  const result = computeReviews({ satisfaction: 70, previousReviews: prev, occupiedRooms: 10 });
  expect(result.count).toBeGreaterThan(50);
});

test("handles null previousReviews gracefully", () => {
  expect(() => computeReviews({ satisfaction: 70, previousReviews: null })).not.toThrow();
});

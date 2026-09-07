import { emptyImpact, pickWeighted, resolveDuration, resolveImpact, rollProbability, sumImpacts, toDateOnly } from "./eventUtils";

describe("rollProbability", () => {
  test("fires when rng rolls below the probability", () => {
    expect(rollProbability(0.5, () => 0.4)).toBe(true);
  });

  test("does not fire when rng rolls at/above the probability", () => {
    expect(rollProbability(0.5, () => 0.5)).toBe(false);
    expect(rollProbability(0.5, () => 0.9)).toBe(false);
  });

  test("clamps an out-of-range probability instead of throwing", () => {
    expect(rollProbability(5, () => 0.9)).toBe(true); // clamped to 1
    expect(rollProbability(-1, () => 0)).toBe(false); // clamped to 0
  });
});

describe("pickWeighted", () => {
  test("picks the first option whose cumulative weight the roll falls under", () => {
    const options = [{ value: "a", weight: 50 }, { value: "b", weight: 50 }];
    expect(pickWeighted(options, () => 0)).toBe("a");
    expect(pickWeighted(options, () => 0.99)).toBe("b");
  });

  test("falls back to the first option when every weight is zero", () => {
    expect(pickWeighted([{ value: "a", weight: 0 }, { value: "b", weight: 0 }], () => 0.5)).toBe("a");
  });

  test("returns undefined for an empty list", () => {
    expect(pickWeighted([], () => 0.5)).toBeUndefined();
  });
});

describe("resolveDuration", () => {
  test("returns a fixed numeric duration as-is", () => {
    expect(resolveDuration(3)).toBe(3);
  });

  test("calls a function duration with (state, context)", () => {
    const duration = jest.fn().mockReturnValue(2);
    expect(resolveDuration(duration, { a: 1 }, { b: 2 })).toBe(2);
    expect(duration).toHaveBeenCalledWith({ a: 1 }, { b: 2 });
  });

  test("defaults to 1 for an invalid/missing duration", () => {
    expect(resolveDuration(undefined)).toBe(1);
    expect(resolveDuration(0)).toBe(1);
    expect(resolveDuration(-5)).toBe(1);
  });
});

describe("resolveImpact", () => {
  test("normalizes a fixed impact object, defaulting missing fields to 0", () => {
    expect(resolveImpact({ revenue: 100 })).toEqual({ revenue: 100, expenses: 0, staff: 0, reputation: 0 });
  });

  test("calls a function impact with (state, context)", () => {
    const impact = jest.fn().mockReturnValue({ expenses: 50 });
    expect(resolveImpact(impact, { a: 1 }, { b: 2 })).toEqual({ revenue: 0, expenses: 50, staff: 0, reputation: 0 });
    expect(impact).toHaveBeenCalledWith({ a: 1 }, { b: 2 });
  });

  test("never throws on a missing/malformed impact", () => {
    expect(resolveImpact(undefined)).toEqual(emptyImpact());
    expect(resolveImpact(null)).toEqual(emptyImpact());
  });
});

describe("sumImpacts", () => {
  test("adds every field across a list of impacts", () => {
    expect(sumImpacts([{ revenue: 100, expenses: 10 }, { revenue: 50, staff: -2, reputation: 1 }])).toEqual({
      revenue: 150,
      expenses: 10,
      staff: -2,
      reputation: 1,
    });
  });

  test("returns all zeros for an empty/missing list", () => {
    expect(sumImpacts([])).toEqual(emptyImpact());
    expect(sumImpacts(undefined)).toEqual(emptyImpact());
  });
});

describe("toDateOnly", () => {
  test("formats a Date to YYYY-MM-DD", () => {
    expect(toDateOnly(new Date("2026-09-10T15:30:00Z"))).toBe("2026-09-10");
  });

  test("passes an already-formatted string through", () => {
    expect(toDateOnly("2026-09-10")).toBe("2026-09-10");
  });
});

import {
  computeBudget,
  computeROI,
  computeConversion,
  computeSegments,
  derivePositioningTier,
  resolvePositioningTier,
  nextPositioningTier,
} from "./marketingCalculations";

describe("computeBudget", () => {
  test("sums enabled channels and non-draft campaigns", () => {
    const budget = computeBudget({
      channels: [{ id: 1, budget: 1000, enabled: true }, { id: 2, budget: 500, enabled: false }],
      campaigns: [{ id: 1, budget: 2000, status: "active" }, { id: 2, budget: 300, status: "draft" }],
    });
    expect(budget).toEqual({ channel: 1000, campaign: 2000, total: 3000 });
  });

  test("safe on empty input", () => {
    expect(computeBudget({})).toEqual({ channel: 0, campaign: 0, total: 0 });
  });
});

describe("computeROI", () => {
  test("budget-weights ROI across active campaigns only", () => {
    const roi = computeROI({
      campaigns: [
        { id: 1, budget: 1000, roi: 2, status: "active" },
        { id: 2, budget: 3000, roi: 1, status: "active" },
        { id: 3, budget: 5000, roi: 10, status: "paused" },
      ],
      totalBudget: 4000,
    });
    // weighted: (1000*2 + 3000*1) / 4000 = 1.25
    expect(roi.campaignsAvgRoi).toBe(1.25);
    expect(roi.overallRoi).toBeCloseTo(1.25, 2);
  });

  test("safe with no active campaigns", () => {
    const roi = computeROI({ campaigns: [], totalBudget: 0 });
    expect(roi).toEqual({ campaignsAvgRoi: 0, overallRoi: 0, generatedRevenue: 0 });
  });
});

describe("computeConversion", () => {
  test("derives a conversion rate from reach and occupied rooms", () => {
    const conversion = computeConversion({ channels: [{ reach: 100, enabled: true }], occupiedRooms: 30 });
    expect(conversion.totalReach).toBe(100);
    expect(conversion.estimatedLeads).toBeGreaterThan(0);
    expect(conversion.conversionRate).toBeGreaterThan(0);
    expect(conversion.conversionRate).toBeLessThanOrEqual(100);
  });

  test("ignores disabled channels", () => {
    const conversion = computeConversion({ channels: [{ reach: 100, enabled: false }], occupiedRooms: 5 });
    expect(conversion.totalReach).toBe(0);
  });
});

describe("computeSegments", () => {
  function reservation(overrides = {}) {
    return { status: "confirmée", price: 100, arrival: "2026-09-01", departure: "2026-09-02", ...overrides };
  }

  test("classifies premium reservations by high relative price", () => {
    const segments = computeSegments([reservation({ price: 100 }), reservation({ price: 100 }), reservation({ price: 400 })]);
    expect(segments.counts.premium).toBeGreaterThan(0);
  });

  test("classifies long stays as famille", () => {
    const segments = computeSegments([reservation({ arrival: "2026-09-01", departure: "2026-09-06" })]);
    expect(segments.counts.famille).toBe(1);
  });

  test("ignores unconfirmed reservations", () => {
    const segments = computeSegments([reservation({ status: "annulée" })]);
    expect(Object.values(segments.counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  test("safe on empty input", () => {
    expect(() => computeSegments([])).not.toThrow();
    expect(() => computeSegments(undefined)).not.toThrow();
  });
});

describe("positioning tiers", () => {
  test("derivePositioningTier maps star rating to a tier", () => {
    expect(derivePositioningTier(1)).toBe("budget");
    expect(derivePositioningTier(3)).toBe("midscale");
    expect(derivePositioningTier(4)).toBe("upscale");
    expect(derivePositioningTier(5)).toBe("luxury");
  });

  test("resolvePositioningTier prefers an explicit tier over the derived one", () => {
    expect(resolvePositioningTier({ marketing: { positioningTier: "luxury" }, starRating: 1 })).toBe("luxury");
    expect(resolvePositioningTier({ marketing: {}, starRating: 5 })).toBe("luxury");
  });

  test("nextPositioningTier cycles through the four tiers", () => {
    expect(nextPositioningTier("budget")).toBe("midscale");
    expect(nextPositioningTier("luxury")).toBe("budget");
  });
});

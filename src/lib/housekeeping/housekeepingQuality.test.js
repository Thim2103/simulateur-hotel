import { computeQualityScore, qualityTier, qualityTrend } from "./housekeepingQuality";

describe("computeQualityScore", () => {
  test("rushed cleaning (below baseline minutes/room) caps quality lower than a comfortable pace", () => {
    const rushed = computeQualityScore({ minutesPerRoom: 10, productivity: 70, trainingLevel: 70 });
    const comfortable = computeQualityScore({ minutesPerRoom: 30, productivity: 70, trainingLevel: 70 });
    expect(rushed).toBeLessThan(comfortable);
  });

  test("higher productivity/training raises quality", () => {
    const low = computeQualityScore({ minutesPerRoom: 30, productivity: 30, trainingLevel: 30 });
    const high = computeQualityScore({ minutesPerRoom: 30, productivity: 90, trainingLevel: 90 });
    expect(high).toBeGreaterThan(low);
  });

  test("real RM satisfaction feeds directly into the score", () => {
    const lowSatisfaction = computeQualityScore({ minutesPerRoom: 30, productivity: 70, trainingLevel: 70, rmSatisfaction: 10 });
    const highSatisfaction = computeQualityScore({ minutesPerRoom: 30, productivity: 70, trainingLevel: 70, rmSatisfaction: 95 });
    expect(highSatisfaction).toBeGreaterThan(lowSatisfaction);
  });

  test("stays within 0-100", () => {
    expect(computeQualityScore({ minutesPerRoom: 1000, productivity: 1000, trainingLevel: 1000, rmSatisfaction: 1000 })).toBeLessThanOrEqual(100);
    expect(computeQualityScore({ minutesPerRoom: 0, productivity: 0, trainingLevel: 0, rmSatisfaction: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe("qualityTier", () => {
  test("labels the score band", () => {
    expect(qualityTier(90)).toBe("excellente");
    expect(qualityTier(70)).toBe("bonne");
    expect(qualityTier(50)).toBe("correcte");
    expect(qualityTier(20)).toBe("insuffisante");
  });
});

describe("qualityTrend", () => {
  test("computes the delta, 0 with no previous value", () => {
    expect(qualityTrend(60, 68)).toBe(8);
    expect(qualityTrend(undefined, 68)).toBe(0);
  });
});

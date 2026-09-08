import { computeTfeScore, scoreGrade, computeRisksAndOpportunities, computeEbitdaMargin } from "./tfeScore";

describe("computeTfeScore", () => {
  test("a healthy hotel across every module scores highly", () => {
    const score = computeTfeScore({ ebitdaMargin: 0.2, occupancyRate: 85, staffMorale: 80, marketingRoi: 2, esgScore: 75, housekeepingQuality: 80, missionsCompletedRatio: 0.8, objectivesAchievedRatio: 0.8 });
    expect(score).toBeGreaterThan(75);
  });

  test("a struggling hotel scores low", () => {
    const score = computeTfeScore({ ebitdaMargin: -0.3, occupancyRate: 10, staffMorale: 20, marketingRoi: 0.2, esgScore: 20, housekeepingQuality: 20, missionsCompletedRatio: 0, objectivesAchievedRatio: 0 });
    expect(score).toBeLessThan(40);
  });

  test("stays within 0-100 on extreme input", () => {
    expect(computeTfeScore({ ebitdaMargin: 100, occupancyRate: 1000, staffMorale: 1000, marketingRoi: 1000, esgScore: 1000, housekeepingQuality: 1000, missionsCompletedRatio: 100, objectivesAchievedRatio: 100 })).toBeLessThanOrEqual(100);
    expect(computeTfeScore({ ebitdaMargin: -100, occupancyRate: -100, staffMorale: -100, marketingRoi: -100, esgScore: -100, housekeepingQuality: -100 })).toBeGreaterThanOrEqual(0);
  });

  test("safe on empty input", () => {
    expect(() => computeTfeScore({})).not.toThrow();
  });
});

describe("scoreGrade", () => {
  test("labels the score band", () => {
    expect(scoreGrade(95)).toBe("A");
    expect(scoreGrade(80)).toBe("B");
    expect(scoreGrade(65)).toBe("C");
    expect(scoreGrade(50)).toBe("D");
    expect(scoreGrade(10)).toBe("F");
  });
});

describe("computeRisksAndOpportunities", () => {
  test("counts errors and high-severity anomalies as risks, opportunities separately", () => {
    const diagnostics = [
      { type: "error", severity: "high", message: "a" },
      { type: "anomaly", severity: "high", message: "b" },
      { type: "anomaly", severity: "medium", message: "c" },
      { type: "opportunity", severity: "low", message: "d" },
      { type: "opportunity", severity: "low", message: "e" },
    ];
    const result = computeRisksAndOpportunities(diagnostics);
    expect(result.risks).toBe(2);
    expect(result.opportunities).toBe(2);
  });

  test("safe on empty input", () => {
    expect(computeRisksAndOpportunities([])).toEqual({ risks: 0, opportunities: 0, riskDetails: [], opportunityDetails: [] });
    expect(computeRisksAndOpportunities(undefined).risks).toBe(0);
  });
});

describe("computeEbitdaMargin", () => {
  test("computes ebitda / revenue", () => {
    expect(computeEbitdaMargin({ ebitda: 25000, revenue: 100000 })).toBe(0.25);
  });

  test("safe when revenue is zero", () => {
    expect(computeEbitdaMargin({ ebitda: 1000, revenue: 0 })).toBe(0);
  });
});

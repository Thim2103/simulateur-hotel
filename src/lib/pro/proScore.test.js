import { computeProScore, scoreGrade, computeDepartmentScores, computeRisksAndOpportunities, computeEbitdaMargin } from "./proScore";

test("returns a mid score for baseline default inputs", () => {
  const score = computeProScore();
  expect(score).toBeGreaterThan(30);
  expect(score).toBeLessThan(70);
});

test("higher inputs across the board raise the score", () => {
  const low = computeProScore({ ebitdaMargin: -0.1, occupancyRate: 20, rmDirectShare: 10, fbGrossMargin: 30, staffMorale: 20, marketingReputation: 20, esgScore: 20, housekeepingQuality: 20, clientsSatisfaction: 20 });
  const high = computeProScore({ ebitdaMargin: 0.25, occupancyRate: 90, rmDirectShare: 70, fbGrossMargin: 70, staffMorale: 90, marketingReputation: 90, esgScore: 90, housekeepingQuality: 90, clientsSatisfaction: 90 });
  expect(high).toBeGreaterThan(low);
});

test("a crisis penalty lowers the score", () => {
  const base = computeProScore({});
  const withCrisis = computeProScore({ crisisScorePenalty: 15 });
  expect(withCrisis).toBeLessThan(base);
});

test("score stays within 0-100", () => {
  expect(computeProScore({ ebitdaMargin: -5, occupancyRate: 0, crisisScorePenalty: 100 })).toBeGreaterThanOrEqual(0);
  expect(computeProScore({ ebitdaMargin: 5, occupancyRate: 200 })).toBeLessThanOrEqual(100);
});

test("scoreGrade maps score ranges to letter grades", () => {
  expect(scoreGrade(95)).toBe("A");
  expect(scoreGrade(80)).toBe("B");
  expect(scoreGrade(65)).toBe("C");
  expect(scoreGrade(50)).toBe("D");
  expect(scoreGrade(20)).toBe("F");
});

test("computeDepartmentScores returns one score per department", () => {
  const scores = computeDepartmentScores({ ebitdaMargin: 0.1, occupancyRate: 70, rmDirectShare: 50, fbGrossMargin: 60, staffMorale: 65, marketingReputation: 60, esgScore: 60, housekeepingQuality: 65, clientsSatisfaction: 70 });
  expect(Object.keys(scores)).toEqual(["finance", "rm", "fb", "staff", "marketing", "esg", "housekeeping", "clients"]);
  Object.values(scores).forEach((value) => {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});

test("computeRisksAndOpportunities counts errors/high-severity anomalies as risks", () => {
  const diagnostics = [
    { type: "error", severity: "high" },
    { type: "anomaly", severity: "high" },
    { type: "anomaly", severity: "low" },
    { type: "opportunity", severity: "low" },
  ];
  const result = computeRisksAndOpportunities(diagnostics);
  expect(result.risks).toBe(2);
  expect(result.opportunities).toBe(1);
});

test("computeEbitdaMargin divides ebitda by revenue", () => {
  expect(computeEbitdaMargin({ ebitda: 1000, revenue: 5000 })).toBe(0.2);
});

test("computeEbitdaMargin returns 0 for zero/negative revenue", () => {
  expect(computeEbitdaMargin({ ebitda: 1000, revenue: 0 })).toBe(0);
});

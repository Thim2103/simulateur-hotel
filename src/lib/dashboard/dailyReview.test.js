import { buildDailyReview } from "./dailyReview";

test("returns null when there is no KPI data yet (no day played)", () => {
  expect(buildDailyReview({ careerState: { day: 1 }, dashboardState: { kpis: null } })).toBeNull();
});

test("builds a summary and a causal chain from today's KPIs", () => {
  const careerState = { day: 3 };
  const dashboardState = {
    kpis: {
      occupancyRate: 90,
      housekeepingQuality: 50,
      satisfaction: 3.0,
      staffMorale: 40,
      profit: -200,
      revenueToday: 3000,
      date: "2026-01-03",
    },
    insights: { diagnostics: [{ type: "error", message: "x" }], recommendations: [{ text: "y", severity: "high" }] },
    notifications: { problems: [{ id: "p1", message: "Profit négatif." }], alerts: [], opportunities: [] },
  };

  const review = buildDailyReview({ careerState, dashboardState });
  expect(review.day).toBe(3);
  expect(review.summary).toEqual({ revenue: 3000, profit: -200, satisfaction: 3.0, staffMorale: 40 });
  expect(review.causalChain.length).toBeGreaterThan(0);
  expect(review.causalChain.some((line) => /housekeeping sous pression/.test(line))).toBe(true);
  expect(review.causalChain.some((line) => /qualité housekeeping/i.test(line))).toBe(true);
  expect(review.diagnostics).toHaveLength(1);
  expect(review.recommendations).toHaveLength(1);
  expect(review.attentionItems).toHaveLength(1);
});

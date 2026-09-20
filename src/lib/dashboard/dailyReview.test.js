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

describe("buildDailyReview / incident reviews", () => {
  const kpis = { occupancyRate: 50, housekeepingQuality: 80, satisfaction: 4, staffMorale: 70, profit: 100, revenueToday: 1000, date: "2026-01-04" };
  const reviews = [
    { id: "review:i1:3", day: 3, rating: 2, text: "Ancien avis" },
    { id: "review:i1:4", day: 4, rating: 1, text: "Machine à laver HS, pas de serviettes propres." },
  ];

  test("surfaces only today's incident reviews, and adds a causal line about them", () => {
    const careerState = { day: 4, hotel: { hotelState: { incidentReviews: reviews } } };
    const review = buildDailyReview({ careerState, dashboardState: { kpis } });
    expect(review.incidentReviews.map((r) => r.id)).toEqual(["review:i1:4"]);
    expect(review.causalChain.some((line) => /pannes non réparées/i.test(line))).toBe(true);
  });

  test("returns no incident reviews and no extra causal line when there are none", () => {
    const review = buildDailyReview({ careerState: { day: 4, hotel: { hotelState: {} } }, dashboardState: { kpis } });
    expect(review.incidentReviews).toEqual([]);
    expect(review.causalChain.some((line) => /pannes non réparées/i.test(line))).toBe(false);
  });
});

describe("buildDailyReview / demand", () => {
  const kpis = { occupancyRate: 50, housekeepingQuality: 80, satisfaction: 4, staffMorale: 70, profit: 100, revenueToday: 1000, date: "2026-01-04" };

  test("describes the last day's demand report", () => {
    const careerState = {
      day: 4,
      lastDayReport: { demandReport: { multiplier: 0.8, factors: { reputation: 1, price: 1, season: 1, events: 1, incidents: 0.7 }, newBookings: 1, turnedAway: 0 } },
    };
    const review = buildDailyReview({ careerState, dashboardState: { kpis } });
    expect(review.demand.tone).toBe("weak");
    expect(review.demand.headline).toMatch(/Demande en baisse \(-20 %\)/);
  });

  test("is null before any day has produced a demand report", () => {
    expect(buildDailyReview({ careerState: { day: 4 }, dashboardState: { kpis } }).demand).toBeNull();
  });
});

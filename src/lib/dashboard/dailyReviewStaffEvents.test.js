import { buildDailyReview } from "./dailyReview";

const kpis = { occupancyRate: 50, housekeepingQuality: 80, satisfaction: 4, staffMorale: 70, profit: 100, revenueToday: 1000, date: "2026-01-04" };
const review = (hotelState, day = 4) => buildDailyReview({ careerState: { day, hotel: { hotelState } }, dashboardState: { kpis } });

test("carries only today's staff events", () => {
  const staffEventLog = [
    { id: "old", day: 3, type: "sick", message: "hier" },
    { id: "new", day: 4, type: "resigned", message: "aujourd'hui" },
  ];
  expect(review({ staffEventLog }).staffEvents.map((e) => e.id)).toEqual(["new"]);
});

test("is empty without a log, and before any day is known", () => {
  expect(review({}).staffEvents).toEqual([]);
  expect(buildDailyReview({ careerState: {}, dashboardState: { kpis } }).staffEvents).toEqual([]);
});

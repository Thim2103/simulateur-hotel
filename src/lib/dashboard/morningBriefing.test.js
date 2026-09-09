import { buildMorningBriefing } from "./morningBriefing";

test("returns a placeholder situation when there is no dashboard data yet", () => {
  const briefing = buildMorningBriefing({ careerState: null, dashboardState: null });
  expect(briefing.day).toBeNull();
  expect(briefing.situation).toMatch(/aucune donnée/i);
  expect(briefing.alerts).toEqual([]);
});

test("aggregates day, kpis, situation, objectives and alerts from career/dashboard state", () => {
  const careerState = { day: 5 };
  const dashboardState = {
    kpis: { occupancyRate: 90, adr: 120, cash: 15000, staffMorale: 70, satisfaction: 4.2, reputation: 80, profit: 500, date: "2026-01-05" },
    careerSummary: { acceptedMissions: [{ id: "m1" }], achievedObjectivesCount: 2, totalObjectives: 5 },
    notifications: { problems: [{ id: "p1", message: "Occupation élevée." }], alerts: [], opportunities: [] },
  };

  const briefing = buildMorningBriefing({ careerState, dashboardState });
  expect(briefing.day).toBe(5);
  expect(briefing.kpis).toMatchObject({ occupancyRate: 90, adr: 120, cash: 15000, staffMorale: 70, satisfaction: 4.2 });
  expect(briefing.situation).toMatch(/forte demande/i);
  expect(briefing.objectives).toEqual({ acceptedMissions: [{ id: "m1" }], achievedObjectivesCount: 2, totalObjectives: 5 });
  expect(briefing.alerts).toHaveLength(1);
});

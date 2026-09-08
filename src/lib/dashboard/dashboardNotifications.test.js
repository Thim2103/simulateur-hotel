import { buildNotifications, notificationsFromDiagnostics, notificationsFromKpis } from "./dashboardNotifications";

test("notificationsFromKpis flags a negative profit as a problem", () => {
  const buckets = notificationsFromKpis({ profit: -250, occupancyRate: 60, satisfaction: 4, staffSatisfaction: 70 });
  expect(buckets.problems).toHaveLength(1);
  expect(buckets.problems[0].message).toMatch(/négatif/);
});

test("notificationsFromKpis flags low occupancy as an alert and high occupancy as an opportunity", () => {
  expect(notificationsFromKpis({ profit: 100, occupancyRate: 20 }).alerts).toHaveLength(1);
  expect(notificationsFromKpis({ profit: 100, occupancyRate: 90 }).opportunities).toHaveLength(1);
  expect(notificationsFromKpis({ profit: 100, occupancyRate: 60 }).alerts).toHaveLength(0);
});

test("notificationsFromKpis flags low satisfaction as a problem and low staff morale as an alert", () => {
  const buckets = notificationsFromKpis({ profit: 100, occupancyRate: 60, satisfaction: 2, staffSatisfaction: 30 });
  expect(buckets.problems.some((n) => n.id === "satisfaction-low")).toBe(true);
  expect(buckets.alerts.some((n) => n.id === "staff-morale-low")).toBe(true);
});

test("notificationsFromKpis returns empty buckets when kpis is null", () => {
  expect(notificationsFromKpis(null)).toEqual({ problems: [], alerts: [], opportunities: [] });
});

test("notificationsFromDiagnostics relabels analytics diagnostic types into the 3 buckets", () => {
  const diagnostics = [
    { type: "error", severity: "high", message: "Objectif requis manqué." },
    { type: "anomaly", severity: "medium", message: "Profit inhabituel." },
    { type: "opportunity", severity: "low", message: "Levier jamais utilisé." },
  ];
  const buckets = notificationsFromDiagnostics(diagnostics);
  expect(buckets.problems).toHaveLength(1);
  expect(buckets.alerts).toHaveLength(1);
  expect(buckets.opportunities).toHaveLength(1);
});

test("buildNotifications merges rule-based and analytics-derived notifications", () => {
  const buckets = buildNotifications({
    kpis: { profit: -50, occupancyRate: 60 },
    diagnostics: [{ type: "error", severity: "high", message: "Erreur." }],
  });
  expect(buckets.problems).toHaveLength(2);
});

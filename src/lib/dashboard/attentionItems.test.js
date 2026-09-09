import { buildAttentionItems } from "./attentionItems";

test("returns an empty list when there are no notifications", () => {
  expect(buildAttentionItems(null)).toEqual([]);
  expect(buildAttentionItems({ problems: [], alerts: [], opportunities: [] })).toEqual([]);
});

test("flattens problems/alerts/opportunities in that order, mapping each to a module link", () => {
  const notifications = {
    problems: [{ id: "p1", message: "Satisfaction client basse (2.0/5).", severity: "high" }],
    alerts: [{ id: "a1", message: "Le moral de l'équipe est bas (40/100).", severity: "medium" }],
    opportunities: [{ id: "o1", message: "Occupation élevée (90%) : augmentez les prix.", severity: "low" }],
  };

  const items = buildAttentionItems(notifications);
  expect(items).toHaveLength(3);
  expect(items[0]).toMatchObject({ id: "p1", bucket: "problems", moduleLink: "/clients/reviews" });
  expect(items[1]).toMatchObject({ id: "a1", bucket: "alerts", moduleLink: "/staff" });
  expect(items[2]).toMatchObject({ id: "o1", bucket: "opportunities", moduleLink: "/rm-dashboard" });
});

test("truncates to the given limit", () => {
  const notifications = {
    problems: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, message: "Problème générique.", severity: "high" })),
    alerts: [],
    opportunities: [],
  };
  expect(buildAttentionItems(notifications, 5)).toHaveLength(5);
});

test("falls back to /analytics when no keyword matches", () => {
  const items = buildAttentionItems({ problems: [{ id: "p1", message: "Situation inhabituelle." }], alerts: [], opportunities: [] });
  expect(items[0].moduleLink).toBe("/analytics");
});

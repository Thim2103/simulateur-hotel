import { technicalIncidentsEvent, technicalIncidentVariants } from "./technicalIncidents";

test("conditions() is always true and probability() is fixed", () => {
  expect(technicalIncidentsEvent.conditions({})).toBe(true);
  expect(technicalIncidentsEvent.probability({})).toBe(0.06);
});

test("apply() picks a variant (equal weights) and returns its message/severity", () => {
  const context = { rng: () => 0 }; // first variant: leak
  const applied = technicalIncidentsEvent.apply({}, context);

  expect(context.variant.id).toBe("leak");
  expect(applied.message).toMatch(/fuite d'eau/i);
  expect(applied.severity).toBe("medium");
});

test("impact()/duration() reflect whichever variant was picked", () => {
  const context = { rng: () => 0.99 }; // last variant: kitchen
  technicalIncidentsEvent.apply({}, context);

  expect(context.variant.id).toBe("kitchen");
  expect(technicalIncidentsEvent.impact({}, context)).toEqual({ revenue: -200, expenses: 450, staff: -2, reputation: 0 });
  expect(technicalIncidentsEvent.duration({}, context)).toBe(1);
});

test("all four documented variants (fuite, ascenseur, clim, cuisine) are reachable", () => {
  expect(technicalIncidentVariants.map((variant) => variant.id).sort()).toEqual(["ac", "elevator", "kitchen", "leak"]);
});

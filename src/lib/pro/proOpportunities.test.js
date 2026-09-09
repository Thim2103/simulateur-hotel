import { computeOpportunities, availableOpportunities, totalPotentialRoi } from "./proOpportunities";

test("returns an empty list when nothing triggers", () => {
  expect(computeOpportunities({ triggeredThisMonth: [], previousOpportunities: [], month: 1 })).toEqual([]);
});

test("adds a newly triggered opportunity as available", () => {
  const triggered = [{ type: "opportunity", id: "subvention", department: "esg", title: "Subvention", description: "…", durationMonths: 3, roiEstimate: 12000 }];
  const result = computeOpportunities({ triggeredThisMonth: triggered, previousOpportunities: [], month: 9 });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: "subvention", status: "available", monthsRemaining: 3, roiEstimate: 12000 });
});

test("ignores crisis-type entries", () => {
  const triggered = [{ type: "crisis", id: "inflation" }];
  expect(computeOpportunities({ triggeredThisMonth: triggered, previousOpportunities: [], month: 1 })).toEqual([]);
});

test("marks a seized opportunity and stops counting down its duration", () => {
  const previous = [{ id: "subvention", status: "available", monthsRemaining: 2, seizedOnMonth: null }];
  const result = computeOpportunities({ triggeredThisMonth: [], previousOpportunities: previous, month: 10, seizedIds: ["subvention"] });
  expect(result[0]).toMatchObject({ status: "seized", seizedOnMonth: 10 });
});

test("expires an available opportunity once its duration runs out", () => {
  const previous = [{ id: "subvention", status: "available", monthsRemaining: 1, seizedOnMonth: null }];
  const result = computeOpportunities({ triggeredThisMonth: [], previousOpportunities: previous, month: 10 });
  expect(result[0]).toMatchObject({ status: "expired", monthsRemaining: 0 });
});

test("availableOpportunities filters to only available entries", () => {
  const opportunities = [{ id: "a", status: "available" }, { id: "b", status: "expired" }];
  expect(availableOpportunities(opportunities)).toEqual([{ id: "a", status: "available" }]);
});

test("totalPotentialRoi sums the ROI of available opportunities only", () => {
  const opportunities = [
    { id: "a", status: "available", roiEstimate: 1000 },
    { id: "b", status: "seized", roiEstimate: 5000 },
    { id: "c", status: "available", roiEstimate: 2000 },
  ];
  expect(totalPotentialRoi(opportunities)).toBe(3000);
});

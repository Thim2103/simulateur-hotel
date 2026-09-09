import { computeCrises, activeCrises, crisesByDepartment, estimateCrisisImpact } from "./proCrises";

test("returns an empty list when nothing triggers", () => {
  expect(computeCrises({ triggeredThisMonth: [], previousCrises: [], month: 1 })).toEqual([]);
});

test("adds a newly triggered crisis as active", () => {
  const triggered = [{ type: "crisis", id: "inflation", department: "finance", title: "Inflation", description: "…", durationMonths: 3 }];
  const result = computeCrises({ triggeredThisMonth: triggered, previousCrises: [], month: 3 });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: "inflation", active: true, monthsRemaining: 3, triggeredOnMonth: 3 });
});

test("ignores opportunity-type entries", () => {
  const triggered = [{ type: "opportunity", id: "subvention", department: "esg" }];
  expect(computeCrises({ triggeredThisMonth: triggered, previousCrises: [], month: 1 })).toEqual([]);
});

test("decrements remaining duration and resolves when it reaches zero", () => {
  const previous = [{ id: "inflation", monthsRemaining: 1, active: true, resolvedOnMonth: null, triggeredOnMonth: 3 }];
  const result = computeCrises({ triggeredThisMonth: [], previousCrises: previous, month: 4 });
  expect(result[0]).toMatchObject({ active: false, monthsRemaining: 0, resolvedOnMonth: 4 });
});

test("activeCrises filters to only active entries", () => {
  const crises = [{ id: "a", active: true }, { id: "b", active: false }];
  expect(activeCrises(crises)).toEqual([{ id: "a", active: true }]);
});

test("crisesByDepartment groups active crises", () => {
  const crises = [
    { id: "a", department: "finance", active: true },
    { id: "b", department: "staff", active: true },
    { id: "c", department: "finance", active: false },
  ];
  const grouped = crisesByDepartment(crises);
  expect(grouped.finance).toHaveLength(1);
  expect(grouped.staff).toHaveLength(1);
});

test("estimateCrisisImpact caps the score penalty at 20", () => {
  const crises = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, active: true }));
  expect(estimateCrisisImpact(crises)).toEqual({ count: 10, scorePenalty: 20 });
});

import { addEvent, addObjective, createDraft, publish, setScoring } from "./scenarioBuilder";

test("createDraft produces a valid-shaped scenario for the given mode", () => {
  const draft = createDraft("academie");
  expect(draft.mode).toBe("academie");
  expect(draft.metadata.status).toBe("draft");
});

test("addObjective/addEvent/setScoring return a new draft without mutating the original", () => {
  const draft = createDraft("solo");
  const withObjective = addObjective(draft, { id: "o1", kpi: "finance.totalProfit", comparator: "gte", target: 0 });
  expect(draft.objectives).toEqual([]);
  expect(withObjective.objectives).toHaveLength(1);

  const withEvent = addEvent(withObjective, { kind: "scheduled", id: "vip", cycleIndex: 3 });
  expect(withEvent.events).toHaveLength(1);

  const withScoring = setScoring(withEvent, { maxScore: 200 });
  expect(withScoring.scoring.maxScore).toBe(200);
  expect(withScoring.scoring.weights).toBeDefined(); // merged, not replaced
});

test("publish refuses a draft with no objectives", () => {
  const { scenario, errors } = publish(createDraft("solo"));
  expect(errors.length).toBeGreaterThan(0);
  expect(scenario.metadata.status).toBe("draft");
});

test("publish stamps a valid draft as published", () => {
  const draft = addObjective(createDraft("solo"), { id: "o1", kpi: "finance.totalProfit", comparator: "gte", target: 0 });
  const { scenario, errors } = publish(draft);
  expect(errors).toEqual([]);
  expect(scenario.metadata.status).toBe("published");
});

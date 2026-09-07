import { createScenarioTemplate, resolveDurationToCycles, validateScenario } from "./scenarioSchema";

test("createScenarioTemplate produces a scenario that validates for every mode", () => {
  ["solo", "academie", "competition", "professionnel"].forEach((mode) => {
    const scenario = createScenarioTemplate(mode, { objectives: [{ id: "o1", kpi: "finance.totalProfit", comparator: "gte", target: 0 }] });
    expect(validateScenario(scenario).valid).toBe(true);
  });
});

test("validateScenario rejects a scenario missing id/title/mode/objectives", () => {
  const { valid, errors } = validateScenario({});
  expect(valid).toBe(false);
  expect(errors.map((e) => e.path)).toEqual(expect.arrayContaining(["id", "title", "mode", "objectives"]));
});

test("validateScenario requires a replay seed for competition scenarios", () => {
  const scenario = createScenarioTemplate("competition", { objectives: [{ id: "o1", kpi: "finance.totalProfit", comparator: "gte", target: 0 }], replay: { seed: null } });
  const { valid, errors } = validateScenario(scenario);
  expect(valid).toBe(false);
  expect(errors.some((e) => e.path === "replay.seed")).toBe(true);
});

test("resolveDurationToCycles converts unit/value into a cycle count", () => {
  expect(resolveDurationToCycles({ unit: "days", value: 14 })).toBe(14);
  expect(resolveDurationToCycles({ unit: "months", value: 3 })).toBe(90);
  expect(resolveDurationToCycles({})).toBe(1);
});

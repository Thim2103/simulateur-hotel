import { buildDecisionGroups, DECISION_THEMES } from "./dailyDecisions";
import { QUICK_ACTION_CATALOG } from "./dashboardActions";

test("groups the quick-action catalog by theme, dropping empty themes", () => {
  const groups = buildDecisionGroups(QUICK_ACTION_CATALOG);
  const ids = groups.map((g) => g.id);
  // The real catalog has pricing/staff/marketing/operations actions, so
  // all four DECISION_THEMES should be present.
  expect(ids).toEqual(DECISION_THEMES.map((t) => t.id));
  groups.forEach((group) => expect(group.actions.length).toBeGreaterThan(0));
});

test("returns no groups for an empty catalog", () => {
  expect(buildDecisionGroups([])).toEqual([]);
});

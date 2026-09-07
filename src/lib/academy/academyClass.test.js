import { addClass, classSummary, createClass, listClasses, removeClass } from "./academyClass";
import { addGroup } from "./academyGroup";
import { createAcademyState } from "./academyState";

test("createClass fills in sensible defaults", () => {
  const classEntry = createClass({ id: "c1", name: "BTS Hôtellerie", teacherId: "u1" });
  expect(classEntry).toEqual(expect.objectContaining({ id: "c1", name: "BTS Hôtellerie", teacherId: "u1" }));
});

test("addClass/listClasses/removeClass manage the roster", () => {
  let state = createAcademyState();
  state = addClass(state, createClass({ id: "c1", name: "Classe A", teacherId: "u1" }));
  expect(listClasses(state)).toHaveLength(1);

  state = removeClass(state, "c1");
  expect(listClasses(state)).toHaveLength(0);
});

test("removeClass also drops the class's groups and assignments", () => {
  let state = createAcademyState();
  state = addClass(state, createClass({ id: "c1", name: "Classe A", teacherId: "u1" }));
  state = addGroup(state, { id: "g1", classId: "c1", name: "Groupe 1", memberNames: [] });
  state = { ...state, assignments: [{ id: "a1", classId: "c1", scenarioId: "s1" }] };

  state = removeClass(state, "c1");

  expect(state.groups).toEqual([]);
  expect(state.assignments).toEqual([]);
});

test("classSummary reports group count and the latest assigned scenario", () => {
  let state = createAcademyState();
  state = addClass(state, createClass({ id: "c1", name: "Classe A", teacherId: "u1" }));
  state = addGroup(state, { id: "g1", classId: "c1", name: "Groupe 1", memberNames: [] });
  state = { ...state, assignments: [{ id: "a1", classId: "c1", scenarioId: "s1" }] };

  expect(classSummary(state, "c1")).toEqual(expect.objectContaining({ groupCount: 1, assignedScenarioId: "s1" }));
});

test("classSummary returns null for an unknown class", () => {
  expect(classSummary(createAcademyState(), "missing")).toBeNull();
});

import { addGroup, addMember, createGroup, listGroupsForClass, removeGroup, removeMember } from "./academyGroup";
import { createAcademyState } from "./academyState";

test("createGroup fills in sensible defaults", () => {
  const group = createGroup({ id: "g1", classId: "c1", name: "Groupe Alpha" });
  expect(group).toEqual(expect.objectContaining({ id: "g1", classId: "c1", name: "Groupe Alpha", memberNames: [] }));
});

test("addGroup/listGroupsForClass only returns groups for that class", () => {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));
  state = addGroup(state, createGroup({ id: "g2", classId: "c2", name: "Groupe B" }));

  expect(listGroupsForClass(state, "c1").map((g) => g.id)).toEqual(["g1"]);
});

test("addMember/removeMember update a specific group's roster", () => {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));

  state = addMember(state, "g1", "Ada");
  expect(state.groups[0].memberNames).toEqual(["Ada"]);

  state = addMember(state, "g1", "Grace");
  state = removeMember(state, "g1", "Ada");
  expect(state.groups[0].memberNames).toEqual(["Grace"]);
});

test("removeGroup also drops that group's run and report", () => {
  let state = createAcademyState({ runsByGroupId: { g1: { status: "running" } }, reportsByGroupId: { g1: { grade: "B" } } });
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));

  state = removeGroup(state, "g1");

  expect(state.groups).toEqual([]);
  expect(state.runsByGroupId.g1).toBeUndefined();
  expect(state.reportsByGroupId.g1).toBeUndefined();
});

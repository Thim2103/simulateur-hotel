// Pure, immutable helpers for managing a class's groups (each group is one
// team of students, playing its own sandboxed scenario run).
import { safeArray, safeString } from "../safe";

export function createGroup({ id, classId, name, memberNames = [] }) {
  return { id, classId, name: safeString(name, "Nouveau groupe"), memberNames: safeArray(memberNames), createdAt: new Date().toISOString() };
}

export function addGroup(state, group) {
  return { ...state, groups: [...safeArray(state.groups), group] };
}

export function removeGroup(state, groupId) {
  const { [groupId]: _removedRun, ...remainingRuns } = state.runsByGroupId || {};
  const { [groupId]: _removedReport, ...remainingReports } = state.reportsByGroupId || {};
  return {
    ...state,
    groups: safeArray(state.groups).filter((entry) => entry.id !== groupId),
    runsByGroupId: remainingRuns,
    reportsByGroupId: remainingReports,
  };
}

export function addMember(state, groupId, memberName) {
  return {
    ...state,
    groups: safeArray(state.groups).map((group) => (group.id === groupId ? { ...group, memberNames: [...group.memberNames, memberName] } : group)),
  };
}

export function removeMember(state, groupId, memberName) {
  return {
    ...state,
    groups: safeArray(state.groups).map((group) =>
      group.id === groupId ? { ...group, memberNames: group.memberNames.filter((name) => name !== memberName) } : group
    ),
  };
}

export function listGroupsForClass(state, classId) {
  return safeArray(state?.groups).filter((entry) => entry.classId === classId);
}

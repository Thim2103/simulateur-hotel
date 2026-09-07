// Pure, immutable helpers for managing the teacher's classes within the
// Academy state (see academyState.js for the overall shape).
import { safeArray, safeString } from "../safe";
import { groupsForClass } from "./academyState";

export function createClass({ id, name, teacherId }) {
  return { id, name: safeString(name, "Nouvelle classe"), teacherId, createdAt: new Date().toISOString() };
}

export function addClass(state, classData) {
  return { ...state, classes: [...safeArray(state.classes), classData] };
}

export function removeClass(state, classId) {
  return {
    ...state,
    classes: safeArray(state.classes).filter((entry) => entry.id !== classId),
    groups: safeArray(state.groups).filter((entry) => entry.classId !== classId),
    assignments: safeArray(state.assignments).filter((entry) => entry.classId !== classId),
  };
}

export function listClasses(state) {
  return safeArray(state?.classes);
}

// A class-level summary used by AcademyDashboard.jsx: how many groups it
// has and whether a scenario has been assigned yet.
export function classSummary(state, classId) {
  const classEntry = safeArray(state.classes).find((entry) => entry.id === classId);
  if (!classEntry) return null;
  const groups = groupsForClass(state, classId);
  const assignments = safeArray(state.assignments).filter((entry) => entry.classId === classId);
  return {
    ...classEntry,
    groupCount: groups.length,
    assignedScenarioId: assignments[assignments.length - 1]?.scenarioId || null,
  };
}

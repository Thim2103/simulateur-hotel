// Assigning a scenario to a class: records the Assignment, and gives every
// existing group in that class its own sandboxed ScenarioRunState (see
// lib/scenario/scenarioEngine.js's initScenarioRun()) -- one run per group,
// entirely independent of the others.
import { safeArray } from "../safe";
import { initScenarioRun } from "../scenario/scenarioEngine";
import { groupsForClass } from "./academyState";

export function createAssignment({ id, classId, scenario, dueAt = null }) {
  return { id, classId, scenarioId: scenario.id, scenario, assignedAt: new Date().toISOString(), dueAt };
}

// Returns the updated academy state: the new assignment, plus one fresh
// run per group already in the class. Groups added to the class later
// need their own explicit initScenarioRunForGroup() call (see
// academyEngine.js).
export function assignScenario(state, { classId, scenario, id, dueAt, playerIdFor = (group) => group.id }) {
  const assignment = createAssignment({ id, classId, scenario, dueAt });
  const groups = groupsForClass(state, classId);

  const runsByGroupId = { ...state.runsByGroupId };
  groups.forEach((group) => {
    runsByGroupId[group.id] = initScenarioRun({ scenario, playerId: playerIdFor(group) });
  });

  return { ...state, assignments: [...safeArray(state.assignments), assignment], runsByGroupId };
}

// A professor-facing progress summary: for every group under this
// assignment, where it stands right now (see AcademyClass.jsx).
export function trackAssignmentProgress(state, classId) {
  const groups = groupsForClass(state, classId);
  return groups.map((group) => {
    const run = state.runsByGroupId?.[group.id];
    if (!run) return { groupId: group.id, groupName: group.name, status: "not_started", cycleIndex: 0, totalCycles: 0, currentScore: null };
    return {
      groupId: group.id,
      groupName: group.name,
      status: run.status,
      cycleIndex: run.cycleIndex,
      totalCycles: run.totalCycles,
      currentScore: run.scoreHistory.length ? run.scoreHistory[run.scoreHistory.length - 1] : null,
    };
  });
}

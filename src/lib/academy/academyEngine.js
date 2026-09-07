// Orchestrates one group's play through its assigned scenario: every call
// wraps lib/scenario/scenarioEngine.js, which already runs runDailyCycle()
// sandboxed (persist: false -- see runDailyCycle.js) so a group's decisions
// never touch the real Supabase hotel tables. This file only tracks each
// group's ScenarioRunState inside the Academy state and records the
// resulting daily reports for the teacher to inspect later.
import { initScenarioRun, playScenarioCycle, runScenarioBatch, finalizeScenarioRun } from "../scenario/scenarioEngine";
import { runForGroup } from "./academyState";

// Adds a run for a group that joined the class after the scenario was
// already assigned (assignScenario() only seeds runs for groups that
// existed at assignment time -- see academyAssignments.js).
export function initScenarioRunForGroup(state, groupId, scenario, playerId = groupId) {
  return { ...state, runsByGroupId: { ...state.runsByGroupId, [groupId]: initScenarioRun({ scenario, playerId }) } };
}

// Plays exactly one cycle for one group. Returns both the updated academy
// state and the ScenarioCycleReport, so the caller (useAcademy.js) can
// show the group's teacher/student a same-cycle result.
export async function runGroupCycle({ state, groupId, decisions = {}, referenceDate = new Date(), rng = Math.random }) {
  const run = runForGroup(state, groupId);
  if (!run) throw new Error(`Aucun scénario en cours pour le groupe ${groupId}.`);

  const { report, runState } = await playScenarioCycle({ runState: run, decisions, referenceDate, rng });

  return {
    report,
    state: { ...state, runsByGroupId: { ...state.runsByGroupId, [groupId]: runState } },
  };
}

// Academy's own accelerated time (1 day IRL = 1 month in-game, see the
// roadmap's boucle du temps): plays several cycles for one group at once,
// without a student clicking through each day.
export async function runGroupBatch({ state, groupId, cycles, decisionsProvider, referenceDate = new Date(), rng = Math.random }) {
  const run = runForGroup(state, groupId);
  if (!run) throw new Error(`Aucun scénario en cours pour le groupe ${groupId}.`);

  const { runState, reports } = await runScenarioBatch({ runState: run, cycles, decisionsProvider, referenceDate, rng });

  return {
    reports,
    state: { ...state, runsByGroupId: { ...state.runsByGroupId, [groupId]: runState } },
  };
}

// Grades a group's run and stores the final report under
// state.reportsByGroupId, ready for AcademyGroup.jsx/AcademyReview.jsx.
export function finalizeGroup(state, groupId) {
  const run = runForGroup(state, groupId);
  if (!run) throw new Error(`Aucun scénario en cours pour le groupe ${groupId}.`);

  const finalReport = finalizeScenarioRun(run);
  return { report: finalReport, state: { ...state, reportsByGroupId: { ...state.reportsByGroupId, [groupId]: finalReport } } };
}

export const academyEngine = { initScenarioRunForGroup, runGroupCycle, runGroupBatch, finalizeGroup };
export default academyEngine;

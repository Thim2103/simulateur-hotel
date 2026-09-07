import { useCallback, useState } from "react";
import {
  addClass as addClassToState,
  addGroup as addGroupToState,
  assignScenario as assignScenarioToState,
  createAcademyState,
  createClass as createClassEntry,
  createGroup as createGroupEntry,
} from "../lib/academy";
import { runGroupCycle as runGroupCycleEngine, finalizeGroup as finalizeGroupEngine } from "../lib/academy/academyEngine";
import { trackAssignmentProgress } from "../lib/academy/academyAssignments";
import { generateFinalReport as generateFinalReportPure } from "../lib/academy/academyEvaluation";
import { findClass, findGroup } from "../lib/academy/academyState";
import academyRepository from "../lib/academy/academyRepository";
import { buildReplayRunFromAcademyGroup } from "../lib/replay/replayEngine";
import replayRepository from "../lib/replay/replayRepository";

// Drives the whole Academy module: a teacher's classes, each class's
// groups, the scenario assigned to a class, and every group's own
// sandboxed run (see lib/academy/academyEngine.js -- which wraps
// lib/scenario/scenarioEngine.js, itself running runDailyCycle() with
// persist: false). State is kept locally and mirrored to Supabase via
// academyRepository.js; a load/save failure surfaces as `error` rather
// than silently reverting to demo data.
export function useAcademy() {
  const [academyState, setAcademyState] = useState(createAcademyState());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useAcademy]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const createClass = useCallback(
    (name) =>
      runWithErrorHandling(async () => {
        const classEntry = await academyRepository.createClass({ name });
        setAcademyState((previous) => addClassToState(previous, createClassEntry(classEntry)));
        return classEntry;
      }),
    [runWithErrorHandling]
  );

  const createGroup = useCallback(
    (classId, name, memberNames = []) =>
      runWithErrorHandling(async () => {
        const group = await academyRepository.createGroup({ classId, name, memberNames });
        setAcademyState((previous) => addGroupToState(previous, createGroupEntry(group)));
        return group;
      }),
    [runWithErrorHandling]
  );

  // Assigns a scenario to every group currently in the class, seeding one
  // sandboxed ScenarioRunState per group, and persists each of those runs.
  const assignScenario = useCallback(
    (classId, scenario) =>
      runWithErrorHandling(async () => {
        const assignment = await academyRepository.createAssignment({ classId, scenario });
        const nextState = assignScenarioToState(academyState, { id: assignment.id, classId, scenario });
        setAcademyState(nextState);
        const groupIds = Object.keys(nextState.runsByGroupId).filter((groupId) => findGroup(nextState, groupId)?.classId === classId);
        await Promise.all(
          groupIds.map((groupId) =>
            academyRepository.saveGroupRun({ classId, groupId, scenarioId: scenario.id, runState: nextState.runsByGroupId[groupId] })
          )
        );
        return assignment;
      }),
    [academyState, runWithErrorHandling]
  );

  // Refreshes one class's groups/assignments/runs/reports from Supabase.
  // Called with no classId, refreshes the teacher's whole class roster
  // instead (see AcademyDashboard.jsx).
  const loadClassState = useCallback(
    (classId) =>
      runWithErrorHandling(async () => {
        if (!classId) {
          const classes = await academyRepository.listClasses();
          setAcademyState((previous) => ({ ...previous, classes }));
          return { classes };
        }
        const bundle = await academyRepository.loadClassBundle(classId);
        setAcademyState((previous) => ({
          ...previous,
          groups: [...previous.groups.filter((group) => group.classId !== classId), ...bundle.groups],
          assignments: [...previous.assignments.filter((entry) => entry.classId !== classId), ...bundle.assignments],
          runsByGroupId: { ...previous.runsByGroupId, ...bundle.runsByGroupId },
          reportsByGroupId: { ...previous.reportsByGroupId, ...bundle.reportsByGroupId },
        }));
        return bundle;
      }),
    [runWithErrorHandling]
  );

  // Refreshes a single group's run (e.g. after another tab/session
  // advanced it).
  const loadGroupState = useCallback(
    (groupId) =>
      runWithErrorHandling(async () => {
        const runState = await academyRepository.loadGroupRun(groupId);
        setAcademyState((previous) => ({ ...previous, runsByGroupId: { ...previous.runsByGroupId, [groupId]: runState } }));
        return runState;
      }),
    [runWithErrorHandling]
  );

  // Pure, no network: where every group in the class currently stands.
  const loadScenarioProgress = useCallback((classId) => trackAssignmentProgress(academyState, classId), [academyState]);

  // Plays one sandboxed cycle for a group and persists the resulting run.
  const runGroupCycle = useCallback(
    (classId, groupId, decisions = {}) =>
      runWithErrorHandling(async () => {
        const { report, state: nextState } = await runGroupCycleEngine({ state: academyState, groupId, decisions });
        setAcademyState(nextState);
        const scenarioId = nextState.runsByGroupId[groupId]?.scenario?.id;
        await academyRepository.saveGroupRun({ classId, groupId, scenarioId, runState: nextState.runsByGroupId[groupId] });
        return report;
      }),
    [academyState, runWithErrorHandling]
  );

  // Grades every group in the class that has finished (or is mid-run) and
  // builds the class-wide final report for the teacher. Also stores a
  // normalized replay run per newly-finalized group (see
  // lib/replay/replayEngine.js) so the Replay Viewer/Compare/Export pages
  // can rejoin the group's playthrough afterwards.
  const generateFinalReport = useCallback(
    (classId) =>
      runWithErrorHandling(async () => {
        const classGroups = academyState.groups.filter((group) => group.classId === classId);
        const assignment = [...academyState.assignments].reverse().find((entry) => entry.classId === classId);

        let state = academyState;
        const reportsToPersist = [];
        classGroups.forEach((group) => {
          if (!state.runsByGroupId[group.id] || state.reportsByGroupId[group.id]) return;
          const { report, state: updated } = finalizeGroupEngine(state, group.id);
          state = updated;
          reportsToPersist.push({ group, report });
        });

        if (state !== academyState) setAcademyState(state);

        await Promise.all(
          reportsToPersist.map(({ group, report }) => academyRepository.saveGroupReport({ classId, groupId: group.id, scenarioId: assignment?.scenarioId, report }))
        );
        await Promise.all(
          reportsToPersist.map(({ group, report }) =>
            replayRepository.saveReplayRun(buildReplayRunFromAcademyGroup(group, state.runsByGroupId[group.id], report))
          )
        );

        const classEntry = findClass(state, classId);
        return generateFinalReportPure(classEntry, classGroups, state.runsByGroupId, assignment);
      }),
    [academyState, runWithErrorHandling]
  );

  return {
    academyState,
    isRunning,
    error,
    createClass,
    createGroup,
    assignScenario,
    loadClassState,
    loadGroupState,
    loadScenarioProgress,
    runGroupCycle,
    generateFinalReport,
  };
}

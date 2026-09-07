// Orchestrates a scenario run around the existing daily-cycle engine: load
// -> init (apply initial state/constraints) -> play one cycle at a time
// (inject events, run the sandboxed daily cycle, evaluate objectives,
// score) -> finalize (grade + replay). See the Scenario Builder Blueprint
// for the full design; this implementation covers a single hotel per run
// (the shape every Academy group actually needs -- a chain-wide scenario
// is a documented future extension, not built here).
import { runDailyCycle } from "../dailyCycle/runDailyCycle";
import { createInitialRestaurantState } from "../restaurant/restaurantState";
import { defaultHotelState } from "../hotel";
import { applyConstraints, checkConstraints } from "./scenarioConstraints";
import { mergeWithEngineEvents, resolveEventsForCycle } from "./scenarioEvents";
import { evaluateObjectives } from "./scenarioObjectives";
import { computeScore } from "./scenarioScoring";
import { buildReplay, createReplayLog, recordCycle } from "./scenarioReplay";
import { evaluateFinal } from "./scenarioEvaluation";
import { resolveDurationToCycles, validateScenario } from "./scenarioSchema";

// Accepts either an already-resolved Scenario object, or (future) a
// scenario id once a scenarioRepository exists. No repository is wired
// today, so an id is rejected with a clear message rather than pretending
// to load something that doesn't exist.
export function loadScenario(scenarioIdOrData) {
  if (scenarioIdOrData && typeof scenarioIdOrData === "object") return scenarioIdOrData;
  throw new Error("loadScenario() requires a scenario object -- no scenario repository is wired up yet.");
}

// 2-3. Apply the scenario's initial state and starting constraints onto
// the hotel/restaurant bundle the caller provides (or bare defaults).
export function initScenarioRun({ scenario, hotelState, restaurantState, rooms = [], reservations = [], playerId = null } = {}) {
  const { valid, errors } = validateScenario(scenario);
  if (!valid) throw new Error(`Scénario invalide : ${errors.map((error) => error.message).join(" ")}`);

  const { state: constrainedHotelState } = applyConstraints(hotelState || defaultHotelState, scenario.constraints);

  return {
    scenario,
    playerId,
    cycleIndex: 0,
    totalCycles: resolveDurationToCycles(scenario.duration),
    hotelState: constrainedHotelState,
    restaurantState: restaurantState || createInitialRestaurantState(),
    rooms,
    reservations,
    objectivesStatus: evaluateObjectives({}, scenario.objectives),
    scoreHistory: [],
    replayLog: createReplayLog(),
    violations: [],
    status: "running",
    triggeredEventIds: new Set(),
  };
}

// 4-6-7-8. Plays one cycle: checks constraints first (a hard violation
// blocks the cycle instead of running it), injects the scenario's own
// events alongside eventEngine's, runs runDailyCycle() sandboxed
// (persist: false -- never touches the real Supabase hotel tables, see
// section 6 of the Academy request), evaluates objectives, scores, and
// records the cycle in the replay log.
export async function playScenarioCycle({ runState, decisions = {}, referenceDate = new Date(), rng = Math.random }) {
  const { scenario } = runState;
  const violations = checkConstraints(runState, decisions, scenario.constraints);
  if (violations.length) {
    return {
      report: { cycleIndex: runState.cycleIndex, blocked: true, violations, decisions },
      runState: { ...runState, violations },
    };
  }

  const scenarioEvents = resolveEventsForCycle({
    cycleIndex: runState.cycleIndex,
    state: runState,
    events: scenario.events,
    triggeredIds: runState.triggeredEventIds,
  });
  scenarioEvents.forEach((event) => runState.triggeredEventIds.add(event.id));

  const dailyReport = await runDailyCycle({
    hotelState: runState.hotelState,
    restaurantState: runState.restaurantState,
    rooms: runState.rooms,
    reservations: runState.reservations,
    referenceDate,
    rng,
    persist: false,
  });

  const mergedEvents = mergeWithEngineEvents(scenarioEvents, dailyReport.events);
  const objectivesStatus = evaluateObjectives(dailyReport, scenario.objectives);
  const scoreBreakdown = computeScore(dailyReport, scenario.scoring, objectivesStatus);

  const cycleReport = {
    cycleIndex: runState.cycleIndex,
    baseReport: dailyReport,
    scenarioEvents: mergedEvents,
    objectivesStatus,
    score: scoreBreakdown.score,
    violations: [],
  };

  const nextCycleIndex = runState.cycleIndex + 1;
  const nextRunState = {
    ...runState,
    cycleIndex: nextCycleIndex,
    hotelState: dailyReport.nextState.hotelState,
    restaurantState: dailyReport.nextState.restaurantState,
    rooms: dailyReport.nextState.rooms,
    reservations: dailyReport.nextState.reservations,
    objectivesStatus,
    scoreHistory: [...runState.scoreHistory, scoreBreakdown.score],
    replayLog: recordCycle(runState.replayLog, { ...cycleReport, decisions }),
    status: nextCycleIndex >= runState.totalCycles ? "finished" : "running",
  };

  return { report: cycleReport, runState: nextRunState };
}

// TFE/professionnel and Academy's own accelerated time both need to play
// several cycles without a human clicking through each one -- a
// decisionsProvider callback stands in for that click.
export async function runScenarioBatch({ runState, cycles, decisionsProvider = () => ({}), referenceDate = new Date(), rng = Math.random }) {
  let currentState = runState;
  const reports = [];

  for (let i = 0; i < cycles && currentState.status !== "finished"; i += 1) {
    const decisions = decisionsProvider(currentState.cycleIndex, currentState);
    const cycleDate = new Date(referenceDate);
    cycleDate.setDate(cycleDate.getDate() + i);
    // eslint-disable-next-line no-await-in-loop -- each cycle depends on the previous one's resulting state.
    const { report, runState: nextState } = await playScenarioCycle({ runState: currentState, decisions, referenceDate: cycleDate, rng });
    reports.push(report);
    currentState = nextState;
  }

  return { runState: currentState, reports };
}

// 9. Grades the run and packages its full replay.
export function finalizeScenarioRun(runState) {
  const evaluation = evaluateFinal(runState.scenario, runState);
  return { ...evaluation, replaySummary: buildReplay(runState.replayLog) };
}

export const scenarioEngine = { loadScenario, initScenarioRun, playScenarioCycle, runScenarioBatch, finalizeScenarioRun };
export default scenarioEngine;

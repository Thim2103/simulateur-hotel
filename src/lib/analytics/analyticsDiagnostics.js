// Turns the raw KPI/decision/event analyses into a flat list of
// diagnostics a player or teacher can actually act on: anomalies (a cycle
// that doesn't look like the others), errors (a blocked cycle or a missed
// required objective), and opportunities (a lever that was never pulled,
// or an objective that was nearly met).
import { safeArray, safeNumber } from "../safe";
import { kpisForCycle } from "../replay/replayKpis";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message, cycleIndex = null) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message, cycleIndex };
}

// A cycle's KPI is an anomaly when it deviates from the run's own average
// by more than the KPI's own volatility would predict -- a cheap,
// dependency-free outlier check (no need for a stats library over a
// handful of cycles).
export function detectAnomalies(cycles, kpiAnalysis) {
  const diagnostics = [];
  safeArray(cycles).forEach((cycle) => {
    const kpis = kpisForCycle(cycle);
    Object.entries(kpiAnalysis).forEach(([key, stats]) => {
      const value = kpis[key];
      if (value === null || value === undefined || stats.average === null) return;
      const spread = Math.max(Math.abs(stats.average) * 0.4, 1);
      if (Math.abs(value - stats.average) > spread * 2) {
        diagnostics.push(diagnostic("anomaly", "medium", `${key} inhabituel au cycle ${cycle.cycleIndex + 1} (${value}, moyenne ${stats.average}).`, cycle.cycleIndex));
      }
    });
  });
  return diagnostics;
}

// Blocked cycles (a constraint violation stopped the cycle, see
// lib/scenario/scenarioEngine.js's playScenarioCycle()) and any required
// objective the final report says was missed.
export function detectErrors(cycles, objectivesResult) {
  const diagnostics = [];
  safeArray(cycles).forEach((cycle) => {
    if (cycle.blocked) {
      diagnostics.push(diagnostic("error", "high", `Décision bloquée au cycle ${cycle.cycleIndex + 1} : ${safeArray(cycle.violations).map((v) => v.message).join(" ")}`, cycle.cycleIndex));
    }
  });
  safeArray(objectivesResult?.objectives).forEach((objective) => {
    if (objective.required && !objective.achieved) {
      diagnostics.push(diagnostic("error", "high", `Objectif requis non atteint : ${objective.label || objective.id} (actuel ${objective.current ?? "—"}, cible ${objective.target}).`));
    }
  });
  return diagnostics;
}

// A decision lever that was never touched, and an objective that came
// close but fell just short -- both worth flagging as "try this next
// time" rather than a straight failure.
export function detectOpportunities(decisionAnalysis, objectivesResult) {
  const diagnostics = [];
  safeArray(decisionAnalysis?.fields).forEach((entry) => {
    if (entry.timesSet === 0) {
      diagnostics.push(diagnostic("opportunity", "low", `Le levier « ${entry.field} » n'a jamais été utilisé.`));
    }
  });
  safeArray(objectivesResult?.objectives).forEach((objective) => {
    if (objective.achieved || objective.current === null) return;
    const target = safeNumber(objective.target, 0);
    const current = safeNumber(objective.current, 0);
    const gap = target === 0 ? Math.abs(current) : Math.abs((target - current) / target);
    if (gap <= 0.1) {
      diagnostics.push(diagnostic("opportunity", "low", `Objectif « ${objective.label || objective.id} » presque atteint (actuel ${current}, cible ${target}) : un petit ajustement suffirait.`));
    }
  });
  return diagnostics;
}

export function generateDiagnostics({ cycles, kpiAnalysis, decisionAnalysis, objectivesResult }) {
  return [
    ...detectAnomalies(cycles, kpiAnalysis),
    ...detectErrors(cycles, objectivesResult),
    ...detectOpportunities(decisionAnalysis, objectivesResult),
  ];
}

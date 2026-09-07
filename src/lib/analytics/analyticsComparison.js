// Compares two already-computed Analyses (see analyticsEngine.js's
// analyzeRun()) -- two strategies, regardless of which mode produced
// them. Reuses lib/replay/replayComparison.js for the raw cycle-aligned
// diff and adds a KPI-average/diagnostics-count comparison on top.
import { safeArray, safeObject } from "../safe";
import { compareScoring } from "../replay/replayComparison";

export function compareKpiAverages(analysisA, analysisB) {
  const kpisA = safeObject(analysisA?.kpis);
  const kpisB = safeObject(analysisB?.kpis);
  const keys = [...new Set([...Object.keys(kpisA), ...Object.keys(kpisB)])];

  return keys.map((key) => ({
    kpi: key,
    a: kpisA[key]?.average ?? null,
    b: kpisB[key]?.average ?? null,
    leader: (kpisA[key]?.average ?? -Infinity) === (kpisB[key]?.average ?? -Infinity) ? null : (kpisA[key]?.average ?? -Infinity) > (kpisB[key]?.average ?? -Infinity) ? "a" : "b",
  }));
}

export function compareDecisionApproaches(analysisA, analysisB) {
  const fieldsA = safeArray(analysisA?.decisions?.fields);
  const fieldsB = safeArray(analysisB?.decisions?.fields);
  const fieldNames = [...new Set([...fieldsA.map((f) => f.field), ...fieldsB.map((f) => f.field)])];

  return fieldNames.map((field) => ({
    field,
    a: fieldsA.find((entry) => entry.field === field) || null,
    b: fieldsB.find((entry) => entry.field === field) || null,
  }));
}

export function compareDiagnosticCounts(analysisA, analysisB) {
  const countBy = (diagnostics, type) => safeArray(diagnostics).filter((entry) => entry.type === type).length;
  return {
    a: { errors: countBy(analysisA?.diagnostics, "error"), anomalies: countBy(analysisA?.diagnostics, "anomaly"), opportunities: countBy(analysisA?.diagnostics, "opportunity") },
    b: { errors: countBy(analysisB?.diagnostics, "error"), anomalies: countBy(analysisB?.diagnostics, "anomaly"), opportunities: countBy(analysisB?.diagnostics, "opportunity") },
  };
}

// The single entry point pages actually call: everything above, plus the
// underlying score comparison (see lib/replay/replayComparison.js).
export function compareStrategies(analysisA, analysisB) {
  return {
    runA: { id: analysisA?.runId, label: analysisA?.ownerLabel },
    runB: { id: analysisB?.runId, label: analysisB?.ownerLabel },
    scoring: compareScoring(analysisA?.replayRun, analysisB?.replayRun),
    kpis: compareKpiAverages(analysisA, analysisB),
    decisions: compareDecisionApproaches(analysisA, analysisB),
    diagnostics: compareDiagnosticCounts(analysisA, analysisB),
  };
}

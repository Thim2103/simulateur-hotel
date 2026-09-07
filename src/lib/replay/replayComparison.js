// Compares two ReplayRuns (see replayState.js) regardless of where they
// came from -- two Academy groups, two Competition players, or a solo
// scenario against a TFE import. Comparison is purely cycle-index-aligned
// and KPI-based; it never assumes the two runs share a scenario.
import { safeArray } from "../safe";
import { eventsForCycle } from "./replayEvents";
import { kpisForCycle } from "./replayKpis";
import { decisionsForCycle } from "./replayTimeline";

// One row per cycle up to the shorter run's length, each side's score/KPIs
// and events side by side.
export function compareTimelines(runA, runB) {
  const cyclesA = safeArray(runA?.cycles);
  const cyclesB = safeArray(runB?.cycles);
  const length = Math.min(cyclesA.length, cyclesB.length);

  return Array.from({ length }, (_, index) => ({
    cycleIndex: index,
    a: { kpis: kpisForCycle(cyclesA[index]), events: eventsForCycle(cyclesA[index]), decisions: decisionsForCycle(cyclesA[index]) },
    b: { kpis: kpisForCycle(cyclesB[index]), events: eventsForCycle(cyclesB[index]), decisions: decisionsForCycle(cyclesB[index]) },
  }));
}

// A single KPI's two series side by side, for a comparison line chart.
export function compareKpiSeries(runA, runB, kpiKey) {
  const rows = compareTimelines(runA, runB);
  return { labels: rows.map((row) => row.cycleIndex), a: rows.map((row) => row.a.kpis[kpiKey] ?? null), b: rows.map((row) => row.b.kpis[kpiKey] ?? null) };
}

// Overall score comparison: who's ahead, and by how much.
export function compareScoring(runA, runB) {
  const scoreA = safeArray(runA?.scoreHistory);
  const scoreB = safeArray(runB?.scoreHistory);
  const finalA = scoreA.length ? scoreA[scoreA.length - 1] : null;
  const finalB = scoreB.length ? scoreB[scoreB.length - 1] : null;

  return {
    a: { runId: runA?.id, label: runA?.ownerLabel, finalScore: finalA },
    b: { runId: runB?.id, label: runB?.ownerLabel, finalScore: finalB },
    leader: finalA === finalB ? null : finalA > (finalB ?? -Infinity) ? "a" : "b",
    delta: finalA !== null && finalB !== null ? finalA - finalB : null,
  };
}

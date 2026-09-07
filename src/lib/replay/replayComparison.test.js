import { compareKpiSeries, compareScoring, compareTimelines } from "./replayComparison";

function run(id, ownerLabel, scoreHistory, cycles) {
  return { id, ownerLabel, scoreHistory, cycles };
}

function cycle(cycleIndex, profit, events = []) {
  return { cycleIndex, score: profit / 10, baseReport: { profit }, scenarioEvents: events, decisions: { pricingADR: 100 + cycleIndex } };
}

test("compareTimelines aligns both runs cycle by cycle, up to the shorter run's length", () => {
  const runA = run("a", "Groupe A", [10, 20], [cycle(0, 100), cycle(1, 200)]);
  const runB = run("b", "Groupe B", [15], [cycle(0, 150)]);

  const rows = compareTimelines(runA, runB);
  expect(rows).toHaveLength(1);
  expect(rows[0].a.kpis.profit).toBe(100);
  expect(rows[0].b.kpis.profit).toBe(150);
});

test("compareKpiSeries returns both runs' values for one KPI, aligned by cycle index", () => {
  const runA = run("a", "A", [], [cycle(0, 100), cycle(1, 200)]);
  const runB = run("b", "B", [], [cycle(0, 50), cycle(1, 80)]);

  expect(compareKpiSeries(runA, runB, "profit")).toEqual({ labels: [0, 1], a: [100, 200], b: [50, 80] });
});

test("compareScoring identifies the leader and the score delta", () => {
  const runA = run("a", "A", [10, 90], []);
  const runB = run("b", "B", [10, 60], []);

  const result = compareScoring(runA, runB);
  expect(result.leader).toBe("a");
  expect(result.delta).toBe(30);
});

test("compareScoring reports no leader on a tie", () => {
  const runA = run("a", "A", [50], []);
  const runB = run("b", "B", [50], []);
  expect(compareScoring(runA, runB).leader).toBeNull();
});

test("compareScoring handles a run with no score yet", () => {
  const runA = run("a", "A", [], []);
  const runB = run("b", "B", [40], []);
  const result = compareScoring(runA, runB);
  expect(result.a.finalScore).toBeNull();
  expect(result.leader).toBe("b");
});

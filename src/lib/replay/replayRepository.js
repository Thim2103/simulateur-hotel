// Persistence for the Replay module (see supabase/migrations/
// 202609070011_replay_module.sql). Not part of the requested
// lib/replay/ file list, but necessary for the same reason
// academyRepository.js/competitionRepository.js were: a finished run has
// to survive a page reload before it can be "replayed" at all. Every pure
// replay*.js file stays storage-agnostic; only this file talks to
// Supabase.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { safeArray } from "../safe";
import { kpisForCycle } from "./replayKpis";

async function select(table, query = (builder) => builder) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await query(client.from(table).select("*"));
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: `select:${table}` }
  );
}

// Persists a full ReplayRun: the run's own summary row, one row per cycle
// (full fidelity in `metadata`, denormalized state_snapshot/decisions/
// events/kpis columns for querying), and one row per event fired across
// the run. Safe to call more than once for the same run (e.g. a group
// finalized twice) -- every write is an upsert or a delete-then-insert.
export async function saveReplayRun(run) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();

  const { error: runError } = await client.from("replay_runs").upsert(
    {
      user_id: userId,
      run_id: run.id,
      metadata: {
        source: run.source,
        ownerRefs: run.ownerRefs,
        ownerLabel: run.ownerLabel,
        scenarioId: run.scenarioId,
        scenarioTitle: run.scenarioTitle,
        status: run.status,
        totalCycles: run.totalCycles,
        scoreHistory: run.scoreHistory,
        finalReport: run.finalReport,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,run_id" }
  );
  if (runError) throw runError;

  const cycles = safeArray(run.cycles);
  if (!cycles.length) return;

  const cycleRows = cycles.map((cycle) => ({
    user_id: userId,
    run_id: run.id,
    cycle_index: cycle.cycleIndex,
    state_snapshot: cycle.baseReport?.nextState || null,
    decisions: cycle.decisions || {},
    events: cycle.scenarioEvents || [],
    kpis: kpisForCycle(cycle),
    metadata: cycle,
  }));

  const { error: cyclesError } = await client.from("replay_cycles").upsert(cycleRows, { onConflict: "user_id,run_id,cycle_index" });
  if (cyclesError) throw cyclesError;

  const kpiRows = cycleRows.map(({ metadata, ...row }) => row);
  const { error: kpisError } = await client.from("replay_kpis").upsert(kpiRows, { onConflict: "user_id,run_id,cycle_index" });
  if (kpisError) throw kpisError;

  const eventRows = cycles.flatMap((cycle) =>
    safeArray(cycle.scenarioEvents).map((event) => ({ user_id: userId, run_id: run.id, cycle_index: cycle.cycleIndex, events: event }))
  );
  const { error: deleteError } = await client.from("replay_events").delete().eq("user_id", userId).eq("run_id", run.id);
  if (deleteError) throw deleteError;
  if (eventRows.length) {
    const { error: eventsError } = await client.from("replay_events").insert(eventRows);
    if (eventsError) throw eventsError;
  }
}

// Rebuilds a ReplayRun from its persisted rows -- the cycle's full
// original shape (cycleIndex/baseReport/scenarioEvents/decisions/score)
// lives in replay_cycles.metadata, so this is a faithful reconstruction,
// not just a KPI summary.
export async function loadReplayRun(runId) {
  const userId = await requireUserId();
  const [runRows, cycleRows] = await Promise.all([
    select("replay_runs", (builder) => builder.eq("user_id", userId).eq("run_id", runId).limit(1)),
    select("replay_cycles", (builder) => builder.eq("user_id", userId).eq("run_id", runId).order("cycle_index")),
  ]);
  const runRow = runRows[0];
  if (!runRow) return null;

  const meta = runRow.metadata || {};
  const cycles = cycleRows.map(
    (row) =>
      row.metadata || {
        cycleIndex: row.cycle_index,
        baseReport: { nextState: row.state_snapshot },
        scenarioEvents: safeArray(row.events),
        decisions: row.decisions || {},
        score: row.kpis?.score ?? null,
      }
  );

  return {
    id: runId,
    source: meta.source,
    ownerRefs: meta.ownerRefs || {},
    ownerLabel: meta.ownerLabel,
    scenarioId: meta.scenarioId,
    scenarioTitle: meta.scenarioTitle,
    status: meta.status,
    totalCycles: meta.totalCycles,
    cycles,
    scoreHistory: safeArray(meta.scoreHistory),
    finalReport: meta.finalReport || null,
  };
}

export async function listReplayRuns() {
  const userId = await requireUserId();
  const rows = await select("replay_runs", (builder) => builder.eq("user_id", userId).order("created_at", { ascending: false }));
  return rows.map((row) => ({
    id: row.run_id,
    source: row.metadata?.source,
    ownerLabel: row.metadata?.ownerLabel,
    scenarioTitle: row.metadata?.scenarioTitle,
    status: row.metadata?.status,
    totalCycles: row.metadata?.totalCycles,
  }));
}

export const replayRepository = { saveReplayRun, loadReplayRun, listReplayRuns };
export default replayRepository;

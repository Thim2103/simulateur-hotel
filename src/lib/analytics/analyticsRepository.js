// Persistence for the Analytics module (see supabase/migrations/
// 202609070012_analytics_module.sql). Not part of the requested
// lib/analytics/ file list, but necessary for the same reason
// replayRepository.js/academyRepository.js were: "liste des analyses" and
// a durable final report both imply an analysis survives a page reload.
// analyzeRun() itself stays a pure, cheap recomputation over an
// already-loaded ReplayRun -- this file only caches/audits its output.
import { assertSupabaseConfigured, requireUserId } from "../supabase";
import { safeLoad } from "../safeLoad";
import { safeArray } from "../safe";

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

export async function saveAnalysis(analysis) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();

  const { error: runError } = await client.from("analytics_runs").upsert(
    {
      user_id: userId,
      run_id: analysis.runId,
      diagnostics: analysis.diagnostics,
      recommendations: analysis.recommendations,
      kpis: analysis.kpis,
      metadata: { source: analysis.source, ownerLabel: analysis.ownerLabel },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,run_id" }
  );
  if (runError) throw runError;

  const cycles = safeArray(analysis.replayRun?.cycles);
  if (!cycles.length) return;

  const cycleRows = cycles.map((cycle) => ({
    user_id: userId,
    run_id: analysis.runId,
    cycle_index: cycle.cycleIndex,
    diagnostics: analysis.diagnostics.filter((diagnostic) => diagnostic.cycleIndex === cycle.cycleIndex),
    kpis: analysis.kpis,
  }));
  const { error: cyclesError } = await client.from("analytics_cycles").upsert(cycleRows, { onConflict: "user_id,run_id,cycle_index" });
  if (cyclesError) throw cyclesError;
}

export async function listAnalyses() {
  const userId = await requireUserId();
  const rows = await select("analytics_runs", (builder) => builder.eq("user_id", userId).order("updated_at", { ascending: false }));
  return rows.map((row) => ({
    runId: row.run_id,
    source: row.metadata?.source,
    ownerLabel: row.metadata?.ownerLabel,
    diagnosticsCount: safeArray(row.diagnostics).length,
    updatedAt: row.updated_at,
  }));
}

// runId here may be a single run's own id, or a synthetic id (a class or
// match id) for a multi-run group/competition report.
export async function saveReport(runId, report) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const { error } = await client.from("analytics_reports").upsert(
    { user_id: userId, run_id: runId, diagnostics: report.diagnostics || [], recommendations: report.recommendations || report.topRecommendations || [], kpis: report.kpiSummary || {}, metadata: report, updated_at: new Date().toISOString() },
    { onConflict: "user_id,run_id" }
  );
  if (error) throw error;
}

export async function loadReport(runId) {
  const userId = await requireUserId();
  const rows = await select("analytics_reports", (builder) => builder.eq("user_id", userId).eq("run_id", runId).order("created_at", { ascending: false }).limit(1));
  return rows[0]?.metadata || null;
}

export const analyticsRepository = { saveAnalysis, listAnalyses, saveReport, loadReport };
export default analyticsRepository;

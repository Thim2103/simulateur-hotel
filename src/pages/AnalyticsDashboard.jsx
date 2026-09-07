import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { useAnalytics } from "../hooks/useAnalytics";

// Global entry point: past analyses (see analyticsRepository.js -- every
// analyzeRun()/generateAnalyticsReport() call caches its result there),
// plus a quick way to analyze a run by id (a group/player/scenario run,
// or the same id as its lib/replay/ ReplayRun).
export default function AnalyticsDashboard() {
  const { isRunning, error, listAnalyses, analyzeRun } = useAnalytics();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [runId, setRunId] = useState("");

  useEffect(() => {
    listAnalyses().then(setAnalyses).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!runId.trim()) return;
    try {
      await analyzeRun(runId.trim());
      navigate(`/analytics/${runId.trim()}`);
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Vue globale</h1>
          <p className="mt-1 text-sm text-slate-500">Diagnostics, recommandations et rapports sur vos runs déjà rejoués.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <Card title="Analyser un run">
        <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Identifiant du run" value={runId} onChange={(event) => setRunId(event.target.value)} placeholder="Ex : academie-c1-g1" />
          </div>
          <Button type="submit" disabled={isRunning || !runId.trim()}>{isRunning ? "Analyse…" : "Analyser"}</Button>
        </form>
      </Card>

      <section aria-labelledby="analytics-list" className="flex flex-col gap-3">
        <h2 id="analytics-list" className="text-base font-semibold text-slate-900">Analyses</h2>
        {analyses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Aucune analyse pour le moment : analysez un run ci-dessus.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {analyses.map((entry) => (
              <Card key={entry.runId} title={entry.ownerLabel || entry.runId}>
                <div className="flex items-center gap-2">
                  <Badge type="info">{entry.source}</Badge>
                  <span className="text-sm text-slate-600">{entry.diagnosticsCount} diagnostic(s)</span>
                </div>
                <div className="mt-3 flex gap-3">
                  <Link to={`/analytics/${entry.runId}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Analyse →</Link>
                  <Link to={`/analytics/${entry.runId}/report`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Rapport →</Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useReplay } from "../hooks/useReplay";

function downloadJson(filename, jsonString) {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// There is no PDF-generation library in this project's dependencies; "PDF"
// export uses the browser's own print-to-PDF over a clean, print-ready
// HTML summary (see lib/replay/replayExport.js's buildSummaryHtml()) --
// window.print() renders whatever the page currently shows, and this page
// already shows that summary.
export default function ReplayExport() {
  const { runId } = useParams();
  const { replayState, isRunning, error, loadReplay, exportReplay } = useReplay();

  useEffect(() => {
    loadReplay(runId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const run = replayState.runsById[replayState.currentRunId];

  if (isRunning && !run) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du replay…
        </span>
      </div>
    );
  }

  if (error && !run) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible de charger ce replay : {error.message}</div>;
  }

  if (!run) return null;

  const exported = exportReplay(runId);
  const finalScore = run.scoreHistory.length ? run.scoreHistory[run.scoreHistory.length - 1] : null;
  const eventFrequency = exported.payload.eventFrequency;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Replay</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Export</h1>
          <p className="mt-1 text-sm text-slate-500">{run.ownerLabel} · {run.scenarioTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadJson(`replay-${runId}.json`, exported.json)}>Exporter JSON</Button>
          <Button onClick={() => window.print()}>Exporter PDF</Button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error.message}</div>}

      <section aria-labelledby="export-summary" className="flex flex-col gap-3">
        <h2 id="export-summary" className="text-base font-semibold text-slate-900">Résumé du replay</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Score final" value={finalScore ?? "—"} />
          <KpiCard label="Cycles joués" value={run.totalCycles} />
          <KpiCard label="Statut" value={run.status} />
        </div>
      </section>

      <section aria-labelledby="export-chart" className="flex flex-col gap-3">
        <h2 id="export-chart" className="text-base font-semibold text-slate-900">Évolution du score</h2>
        <LineChart title="Score par cycle" labels={run.cycles.map((cycle) => `Cycle ${cycle.cycleIndex + 1}`)} data={run.scoreHistory} />
      </section>

      <section aria-labelledby="export-events" className="flex flex-col gap-3">
        <h2 id="export-events" className="text-base font-semibold text-slate-900">Fréquence des événements</h2>
        <Card>
          {Object.keys(eventFrequency).length === 0 ? (
            <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {Object.entries(eventFrequency).map(([eventId, count]) => (
                <li key={eventId} className="flex justify-between rounded-lg border border-slate-200 p-2">
                  <span className="font-medium text-slate-900">{eventId}</span>
                  <span className="text-slate-600">{count} occurrence(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

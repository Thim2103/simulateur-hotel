import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useReplay } from "../hooks/useReplay";
import { buildTimeline } from "../lib/replay/replayTimeline";
import { kpisForCycle } from "../lib/replay/replayKpis";

export default function ReplayViewer() {
  const { runId } = useParams();
  const { replayState, isRunning, error, loadReplay, getCycle, nextCycle, previousCycle, jumpToCycle } = useReplay();

  useEffect(() => {
    loadReplay(runId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const run = replayState.runsById[replayState.currentRunId];
  const cycleIndex = replayState.currentCycleIndex;
  const cycle = getCycle(cycleIndex);
  const timeline = run ? buildTimeline(run.cycles) : [];
  const kpis = cycle ? kpisForCycle(cycle) : null;
  const state = cycle?.baseReport?.nextState;

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

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Replay</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{run.ownerLabel}</h1>
          <p className="mt-1 text-sm text-slate-500">{run.scenarioTitle} · Source : {run.source} · Statut : {run.status}</p>
        </div>
        <div className="flex gap-3">
          <Link to={`/analytics/${runId}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Analyser →</Link>
          <Link to={`/replay/${runId}/export`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Exporter →</Link>
        </div>
      </header>

      <section aria-labelledby="replay-timeline" className="flex flex-col gap-3">
        <h2 id="replay-timeline" className="text-base font-semibold text-slate-900">Timeline</h2>
        <Card>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Cycles du replay">
            {timeline.map((entry) => (
              <button
                key={entry.cycleIndex}
                type="button"
                onClick={() => jumpToCycle(entry.cycleIndex)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  entry.cycleIndex === cycleIndex ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Cycle {entry.cycleIndex + 1}
                {entry.eventCount > 0 && <span className="ml-1 text-[10px] opacity-80">· {entry.eventCount} év.</span>}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={previousCycle} disabled={cycleIndex === 0}>← Cycle précédent</Button>
            <span className="text-sm font-medium text-slate-600">Cycle {cycleIndex + 1} / {run.totalCycles}</span>
            <Button variant="secondary" onClick={nextCycle} disabled={cycleIndex >= run.totalCycles - 1}>Cycle suivant →</Button>
          </div>
        </Card>
      </section>

      {!cycle ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Ce cycle n'a pas été joué.</div>
      ) : (
        <>
          <section aria-labelledby="replay-kpis" className="flex flex-col gap-3">
            <h2 id="replay-kpis" className="text-base font-semibold text-slate-900">KPI du cycle</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Score" value={kpis.score ?? "—"} />
              <KpiCard label="Profit" value={kpis.profit !== null ? `${kpis.profit.toLocaleString()} €` : "—"} />
              <KpiCard label="ADR recommandé" value={kpis.recommendedADR !== null ? `${kpis.recommendedADR} €` : "—"} />
              <KpiCard label="Réputation" value={kpis.reputation ?? "—"} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section aria-labelledby="replay-decisions" className="flex flex-col gap-3">
              <h2 id="replay-decisions" className="text-base font-semibold text-slate-900">Décisions du cycle</h2>
              <Card>
                {Object.keys(cycle.decisions || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune décision spécifique ce cycle.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {Object.entries(cycle.decisions).map(([key, value]) => (
                      <li key={key} className="flex justify-between rounded-lg border border-slate-200 p-2">
                        <span className="font-medium text-slate-900">{key}</span>
                        <span className="text-slate-600">{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section aria-labelledby="replay-events" className="flex flex-col gap-3">
              <h2 id="replay-events" className="text-base font-semibold text-slate-900">Événements du cycle</h2>
              <Card>
                {(cycle.scenarioEvents || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun événement ce cycle.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cycle.scenarioEvents.map((event) => (
                      <li key={event.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                        <Badge type="warning">{event.category || event.id}</Badge>
                        <p className="mt-1 text-slate-700">{event.message || event.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>

          <section aria-labelledby="replay-state" className="flex flex-col gap-3">
            <h2 id="replay-state" className="text-base font-semibold text-slate-900">État de l'hôtel</h2>
            <Card>
              {!state ? (
                <p className="text-sm text-slate-500">Aucun état enregistré pour ce cycle.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                  <div><span className="font-medium text-slate-900">Chambres</span><p className="text-slate-600">{state.rooms?.length ?? "—"}</p></div>
                  <div><span className="font-medium text-slate-900">Réservations</span><p className="text-slate-600">{state.reservations?.length ?? "—"}</p></div>
                  <div><span className="font-medium text-slate-900">Staff restaurant</span><p className="text-slate-600">{state.restaurantState?.staff?.length ?? "—"}</p></div>
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

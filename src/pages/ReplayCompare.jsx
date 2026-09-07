import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useReplay } from "../hooks/useReplay";

export default function ReplayCompare() {
  const { runIdA, runIdB } = useParams();
  const { isRunning, error, compareRuns } = useReplay();
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    compareRuns(runIdA, runIdB)
      .then(setComparison)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdA, runIdB]);

  if (isRunning && !comparison) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement de la comparaison…
        </span>
      </div>
    );
  }

  if (error && !comparison) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible de comparer ces replays : {error.message}</div>;
  }

  if (!comparison) return null;

  const { runA, runB, timeline, scoring } = comparison;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Replay</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Comparaison</h1>
          <p className="mt-1 text-sm text-slate-500">{runA.ownerLabel} vs {runB.ownerLabel}</p>
        </div>
      </header>

      <section aria-labelledby="compare-scoring" className="flex flex-col gap-3">
        <h2 id="compare-scoring" className="text-base font-semibold text-slate-900">Scoring comparé</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label={scoring.a.label} value={scoring.a.finalScore ?? "—"} />
          <KpiCard label={scoring.b.label} value={scoring.b.finalScore ?? "—"} />
          <KpiCard label="Écart" value={scoring.delta !== null ? scoring.delta : "—"} />
        </div>
        {scoring.leader && (
          <p className="text-sm text-slate-600">
            <Badge type="success">{scoring.leader === "a" ? scoring.a.label : scoring.b.label}</Badge> mène la comparaison.
          </p>
        )}
      </section>

      <section aria-labelledby="compare-timeline" className="flex flex-col gap-3">
        <h2 id="compare-timeline" className="text-base font-semibold text-slate-900">Timelines comparées</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">{runA.ownerLabel} — Profit</th>
                <th className="px-4 py-3">{runB.ownerLabel} — Profit</th>
                <th className="px-4 py-3">{runA.ownerLabel} — Événements</th>
                <th className="px-4 py-3">{runB.ownerLabel} — Événements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeline.map((row) => (
                <tr key={row.cycleIndex}>
                  <td className="px-4 py-3 font-medium text-slate-900">Cycle {row.cycleIndex + 1}</td>
                  <td className="px-4 py-3 text-slate-600">{row.a.kpis.profit ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.b.kpis.profit ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.a.events.length}</td>
                  <td className="px-4 py-3 text-slate-600">{row.b.events.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="compare-decisions" className="flex flex-col gap-3">
        <h2 id="compare-decisions" className="text-base font-semibold text-slate-900">Décisions comparées</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ label: runA.ownerLabel, side: "a" }, { label: runB.ownerLabel, side: "b" }].map(({ label, side }) => (
            <Card key={side} title={label}>
              {timeline.every((row) => Object.keys(row[side].decisions).length === 0) ? (
                <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {timeline.map((row) => (
                    <li key={row.cycleIndex} className="rounded-lg border border-slate-200 p-2">
                      <span className="font-medium text-slate-900">Cycle {row.cycleIndex + 1}</span>
                      <span className="ml-2 text-slate-600">{JSON.stringify(row[side].decisions)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="compare-events" className="flex flex-col gap-3">
        <h2 id="compare-events" className="text-base font-semibold text-slate-900">Événements comparés</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ label: runA.ownerLabel, side: "a" }, { label: runB.ownerLabel, side: "b" }].map(({ label, side }) => {
            const events = timeline.flatMap((row) => row[side].events.map((event) => ({ cycleIndex: row.cycleIndex, event })));
            return (
              <Card key={side} title={label}>
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun événement.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {events.map(({ cycleIndex, event }) => (
                      <li key={`${cycleIndex}-${event.id}`} className="rounded-lg border border-slate-200 p-2">
                        Cycle {cycleIndex + 1} · {event.message || event.name || event.id}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

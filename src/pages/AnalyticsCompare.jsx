import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useAnalytics } from "../hooks/useAnalytics";

export default function AnalyticsCompare() {
  const { runIdA, runIdB } = useParams();
  const { isRunning, error, compareRuns } = useAnalytics();
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    compareRuns(runIdA, runIdB).then(setComparison).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdA, runIdB]);

  if (isRunning && !comparison) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Comparaison en cours…
        </span>
      </div>
    );
  }

  if (error && !comparison) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible de comparer ces analyses : {error.message}</div>;
  }

  if (!comparison) return null;

  const { runA, runB, scoring, kpis, decisions, diagnostics } = comparison;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Comparaison de stratégies</h1>
          <p className="mt-1 text-sm text-slate-500">{runA.label} vs {runB.label}</p>
        </div>
      </header>

      <section aria-labelledby="compare-scoring" className="flex flex-col gap-3">
        <h2 id="compare-scoring" className="text-base font-semibold text-slate-900">Scoring comparé</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label={scoring.a.label} value={scoring.a.finalScore ?? "—"} />
          <KpiCard label={scoring.b.label} value={scoring.b.finalScore ?? "—"} />
          <KpiCard label="Écart" value={scoring.delta ?? "—"} />
        </div>
      </section>

      <section aria-labelledby="compare-kpis" className="flex flex-col gap-3">
        <h2 id="compare-kpis" className="text-base font-semibold text-slate-900">KPI comparés</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">KPI</th>
                <th className="px-4 py-3">{runA.label}</th>
                <th className="px-4 py-3">{runB.label}</th>
                <th className="px-4 py-3">Leader</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kpis.map((row) => (
                <tr key={row.kpi}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.kpi}</td>
                  <td className="px-4 py-3 text-slate-600">{row.a ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.b ?? "—"}</td>
                  <td className="px-4 py-3">{row.leader ? <Badge type="success">{row.leader === "a" ? runA.label : runB.label}</Badge> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="compare-decisions" className="flex flex-col gap-3">
        <h2 id="compare-decisions" className="text-base font-semibold text-slate-900">Décisions comparées</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Levier</th>
                <th className="px-4 py-3">{runA.label}</th>
                <th className="px-4 py-3">{runB.label}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {decisions.map((row) => (
                <tr key={row.field}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.field}</td>
                  <td className="px-4 py-3 text-slate-600">{row.a ? `${row.a.timesSet}×` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.b ? `${row.b.timesSet}×` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="compare-diagnostics" className="flex flex-col gap-3">
        <h2 id="compare-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics comparés</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ label: runA.label, data: diagnostics.a }, { label: runB.label, data: diagnostics.b }].map(({ label, data }) => (
            <Card key={label} title={label}>
              <div className="flex gap-4 text-sm">
                <span>Erreurs : <strong>{data.errors}</strong></span>
                <span>Anomalies : <strong>{data.anomalies}</strong></span>
                <span>Opportunités : <strong>{data.opportunities}</strong></span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useAnalytics } from "../hooks/useAnalytics";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

export default function AnalyticsRun() {
  const { runId } = useParams();
  const { analyticsState, isRunning, error, analyzeRun } = useAnalytics();

  useEffect(() => {
    analyzeRun(runId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const analysis = analyticsState.analysesById[runId];

  if (isRunning && !analysis) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Analyse en cours…
        </span>
      </div>
    );
  }

  if (error && !analysis) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible d'analyser ce run : {error.message}</div>;
  }

  if (!analysis) return null;

  const kpiEntries = Object.entries(analysis.kpis).filter(([, stats]) => stats.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{analysis.ownerLabel}</h1>
          <p className="mt-1 text-sm text-slate-500">Source : {analysis.source}</p>
        </div>
        <Link to={`/analytics/${runId}/report`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Rapport final →</Link>
      </header>

      <section aria-labelledby="analytics-kpis" className="flex flex-col gap-3">
        <h2 id="analytics-kpis" className="text-base font-semibold text-slate-900">KPI</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiEntries.map(([key, stats]) => (
            <KpiCard key={key} label={key} value={stats.average ?? "—"} trend={stats.trend === "increasing" ? 1 : stats.trend === "decreasing" ? -1 : 0} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section aria-labelledby="analytics-decisions" className="flex flex-col gap-3">
          <h2 id="analytics-decisions" className="text-base font-semibold text-slate-900">Décisions</h2>
          <Card>
            {analysis.decisions.fields.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {analysis.decisions.fields.map((entry) => (
                  <li key={entry.field} className="flex justify-between rounded-lg border border-slate-200 p-2">
                    <span className="font-medium text-slate-900">{entry.field}</span>
                    <span className="text-slate-600">{entry.timesSet}× · variation moy. {entry.averageSwing}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="analytics-events" className="flex flex-col gap-3">
          <h2 id="analytics-events" className="text-base font-semibold text-slate-900">Événements</h2>
          <Card>
            {analysis.events.impact.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {analysis.events.impact.map((entry) => (
                  <li key={entry.eventId} className="flex justify-between rounded-lg border border-slate-200 p-2">
                    <span className="font-medium text-slate-900">{entry.eventId}</span>
                    <span className="text-slate-600">{entry.occurrences}× · Δ score moy. {entry.averageScoreDelta ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section aria-labelledby="analytics-diagnostics" className="flex flex-col gap-3">
        <h2 id="analytics-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics</h2>
        <Card>
          {analysis.diagnostics.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun diagnostic : rien à signaler.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {analysis.diagnostics.map((diagnostic, index) => (
                <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="text-slate-700">{diagnostic.message}</span>
                  <Badge type={SEVERITY_BADGE[diagnostic.severity] || "info"}>{diagnostic.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="analytics-recommendations" className="flex flex-col gap-3">
        <h2 id="analytics-recommendations" className="text-base font-semibold text-slate-900">Recommandations</h2>
        <Card>
          {analysis.recommendations.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune recommandation pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="rounded-lg border border-slate-200 p-2 text-slate-700">{recommendation.text}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

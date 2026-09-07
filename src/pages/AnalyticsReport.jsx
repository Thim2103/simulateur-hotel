import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useAnalytics } from "../hooks/useAnalytics";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsReport() {
  const { runId } = useParams();
  const { isRunning, error, generateAnalyticsReport } = useAnalytics();
  const [report, setReport] = useState(null);

  useEffect(() => {
    generateAnalyticsReport(runId).then(setReport).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  if (isRunning && !report) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Génération du rapport…
        </span>
      </div>
    );
  }

  if (error && !report) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible de générer ce rapport : {error.message}</div>;
  }

  if (!report) return null;

  const kpiEntries = Object.entries(report.kpiSummary).filter(([, stats]) => stats.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport final</h1>
          <p className="mt-1 text-sm text-slate-500">{report.ownerLabel} · Source : {report.source}</p>
        </div>
        <Button variant="secondary" onClick={() => downloadJson(`analytics-${runId}.json`, report)}>Exporter (JSON)</Button>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error.message}</div>}

      <section aria-labelledby="report-summary" className="flex flex-col gap-3">
        <h2 id="report-summary" className="text-base font-semibold text-slate-900">Résumé</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Score final" value={report.finalScore ?? "—"} />
          <KpiCard label="Diagnostics" value={report.diagnostics.length} />
          <KpiCard label="Recommandations" value={report.recommendations.length} />
        </div>
      </section>

      <section aria-labelledby="report-chart" className="flex flex-col gap-3">
        <h2 id="report-chart" className="text-base font-semibold text-slate-900">KPI moyens</h2>
        <LineChart title="Moyenne par KPI" labels={kpiEntries.map(([key]) => key)} data={kpiEntries.map(([, stats]) => stats.average)} />
      </section>

      <section aria-labelledby="report-top-recommendations" className="flex flex-col gap-3">
        <h2 id="report-top-recommendations" className="text-base font-semibold text-slate-900">Recommandations prioritaires</h2>
        <Card>
          {report.topRecommendations.length === 0 ? (
            <p className="text-sm text-slate-500">Rien à signaler.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {report.topRecommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="text-slate-700">{recommendation.text}</span>
                  <Badge type={SEVERITY_BADGE[recommendation.severity] || "info"}>{recommendation.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { loyaltyGrade } from "../lib/clients/clientsLoyalty";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// Route: /clients/report -- rapport clients complet (satisfaction,
// fidélité, segments, avis, plaintes, replay, diagnostics détaillés).
// Built on useClientsEngine.js's getClientsReport().
export default function ClientsReport() {
  const { careerState } = useCareerContext();
  const { clientsState, isRunning, error, loadClientsState, getClientsReport } = useClientsEngine();

  useEffect(() => {
    loadClientsState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Relation client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport clients</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le rapport clients.</p>
          </div>
        </header>
        <Card><Link to="/clients"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const report = clientsState ? getClientsReport() : null;
  const replayEntries = report?.replay?.entries || [];
  const trendLabels = replayEntries.map((e) => `Cycle ${e.cycleIndex + 1}`);

  const handleExportHTML = () => {
    if (!report) return;
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport Clients — Hospitality Lab</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}h1,h2{color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}th{background:#f8fafc}ul{padding-left:1.2rem}</style>
</head>
<body>
<h1>Rapport Clients — Hospitality Lab</h1>
<p>Généré le ${new Date().toLocaleDateString("fr-FR")} | Période : ${report.period ?? "—"} | Cycles : ${report.replay.totalCycles}</p>
<h2>Satisfaction &amp; Fidélité</h2>
<table><tr><th>Indicateur</th><th>Valeur</th></tr>
<tr><td>Satisfaction globale</td><td>${report.satisfaction ?? "—"}/100</td></tr>
<tr><td>Fidélité</td><td>${report.loyalty ?? "—"}/100</td></tr>
<tr><td>Profil fidélité</td><td>${loyaltyGrade(report.loyalty)}</td></tr>
<tr><td>Note clients</td><td>${report.reviews?.avgRating?.toFixed(1) ?? "—"}/5</td></tr>
<tr><td>Avis positifs</td><td>${report.reviews?.positive ?? "—"}%</td></tr>
<tr><td>Avis négatifs</td><td>${report.reviews?.negative ?? "—"}%</td></tr>
<tr><td>Tendance avis</td><td>${report.reviews?.trend ?? "—"}</td></tr>
</table>
<h2>Segments</h2>
<table><tr><th>Segment</th><th>Part (%)</th></tr>
${Object.entries(report.segments || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
</table>
<h2>Diagnostics</h2>
<ul>${(report.diagnostics || []).map((d) => `<li>[${d.severity}] ${d.message}</li>`).join("")}</ul>
<h2>Replay (${report.replay.totalCycles} cycles)</h2>
<table><tr><th>Cycle</th><th>Satisfaction</th><th>Fidélité</th><th>Note</th></tr>
${replayEntries.map((e) => `<tr><td>${e.cycleIndex + 1}</td><td>${e.satisfaction ?? "—"}</td><td>${e.loyalty ?? "—"}</td><td>${e.avgRating?.toFixed(1) ?? "—"}</td></tr>`).join("")}
</table>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rapport complet -- satisfaction, fidélité, avis, segments, replay. Jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportHTML} disabled={!report}>
            Exporter HTML
          </Button>
          <Link to="/clients"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !clientsState ? (
        <Card><p className="text-sm text-slate-500">Chargement du rapport…</p></Card>
      ) : !report ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer le rapport clients.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Satisfaction" value={`${report.satisfaction ?? "—"}/100`} trend={report.satisfaction >= 60 ? undefined : -1} />
            <KpiCard label="Fidélité" value={`${report.loyalty ?? "—"}/100`} trend={report.loyalty >= 50 ? undefined : -1} />
            <KpiCard label="Note clients" value={report.reviews?.avgRating ? `${report.reviews.avgRating.toFixed(1)}/5` : "—"} />
            <KpiCard label="Profil fidélité" value={loyaltyGrade(report.loyalty)} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Segments clients">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Segment</th>
                    <th className="pb-2 text-right">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.segments || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td className="py-1 capitalize text-slate-700">{key}</td>
                      <td className="py-1 text-right font-medium text-slate-900">{value}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Avis clients">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">Note moyenne</dt>
                <dd className="font-medium text-slate-900">{report.reviews?.avgRating?.toFixed(1) ?? "—"}/5</dd>
                <dt className="text-slate-500">Nombre d'avis</dt>
                <dd className="font-medium text-slate-900">{report.reviews?.count ?? 0}</dd>
                <dt className="text-slate-500">Positifs</dt>
                <dd className="font-medium text-slate-900">{report.reviews?.positive ?? 0}%</dd>
                <dt className="text-slate-500">Négatifs</dt>
                <dd className="font-medium text-slate-900">{report.reviews?.negative ?? 0}%</dd>
                <dt className="text-slate-500">Tendance</dt>
                <dd className="font-medium text-slate-900">{report.reviews?.trend ?? "—"}</dd>
              </dl>
            </Card>
          </div>

          <section aria-labelledby="report-diagnostics" className="flex flex-col gap-3">
            <h2 id="report-diagnostics" className="text-base font-semibold text-slate-900">
              Diagnostics ({report.diagnostics.length})
            </h2>
            <Card>
              {report.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.diagnostics.map((diag, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diag.message}</span>
                      <Badge type={SEVERITY_BADGE[diag.severity] || "info"}>{diag.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="report-replay" className="flex flex-col gap-3">
            <h2 id="report-replay" className="text-base font-semibold text-slate-900">
              Replay ({report.replay.totalCycles} cycles)
            </h2>
            <LineChart
              title="Satisfaction par cycle"
              labels={trendLabels}
              data={replayEntries.map((e) => e.satisfaction ?? 0)}
            />
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Cycle</th>
                      <th className="pb-2 pr-4">Période</th>
                      <th className="pb-2 pr-4">Satisfaction</th>
                      <th className="pb-2 pr-4">Fidélité</th>
                      <th className="pb-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replayEntries.map((entry) => (
                      <tr key={entry.cycleIndex} className="border-t border-slate-100">
                        <td className="py-1.5 pr-4 text-slate-600">{entry.cycleIndex + 1}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{entry.period ?? "—"}</td>
                        <td className="py-1.5 pr-4 font-medium text-slate-900">{entry.satisfaction ?? "—"}/100</td>
                        <td className="py-1.5 pr-4 text-slate-700">{entry.loyalty ?? "—"}/100</td>
                        <td className="py-1.5 text-slate-700">{entry.avgRating ? `${entry.avgRating.toFixed(1)}/5` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

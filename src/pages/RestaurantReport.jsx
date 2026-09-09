import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// Route: /restaurant/report -- rapport F&B complet (food cost,
// rentabilité, menu engineering, diagnostics détaillés, replay). Built
// on useRestaurantAdvanced.js's getRestaurantAdvancedReport().
export default function RestaurantReport() {
  const { careerState } = useCareerContext();
  const { restaurantAdvancedState, isRunning, error, loadRestaurantAdvancedState, getRestaurantAdvancedReport } = useRestaurantAdvanced();

  useEffect(() => {
    loadRestaurantAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Restaurant avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport F&amp;B</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le rapport F&amp;B.</p>
          </div>
        </header>
        <Card><Link to="/restaurant/menu-engineering"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const report = restaurantAdvancedState ? getRestaurantAdvancedReport() : null;
  const replayEntries = report?.replay?.entries || [];
  const trendLabels = replayEntries.map((e) => `Cycle ${e.cycleIndex + 1}`);

  const handleExportHTML = () => {
    if (!report) return;
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport F&amp;B — Hospitality Lab</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}h1,h2{color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}th{background:#f8fafc}ul{padding-left:1.2rem}</style>
</head>
<body>
<h1>Rapport F&amp;B — Hospitality Lab</h1>
<p>Généré le ${new Date().toLocaleDateString("fr-FR")} | Période : ${report.period ?? "—"} | Cycles : ${report.replay.totalCycles}</p>
<h2>Food Cost &amp; Rentabilité</h2>
<table><tr><th>Indicateur</th><th>Valeur</th></tr>
<tr><td>Food cost global</td><td>${report.foodCost?.overall ?? "—"}%</td></tr>
<tr><td>Gaspillage</td><td>${report.foodCost?.wastePct ?? "—"}%</td></tr>
<tr><td>Marge brute</td><td>${report.profitability?.grossMargin ?? "—"}%</td></tr>
<tr><td>Marge nette</td><td>${report.profitability?.netMargin ?? "—"}%</td></tr>
</table>
<h2>Menu Engineering</h2>
<table><tr><th>Quadrant</th><th>Nombre</th></tr>
${Object.entries(report.menuEngineering?.counts || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
</table>
<h2>Diagnostics</h2>
<ul>${(report.diagnostics || []).map((d) => `<li>[${d.severity}] ${d.message}</li>`).join("")}</ul>
<h2>Replay (${report.replay.totalCycles} cycles)</h2>
<table><tr><th>Cycle</th><th>Food cost</th><th>Marge brute</th></tr>
${replayEntries.map((e) => `<tr><td>${e.cycleIndex + 1}</td><td>${e.foodCost ?? "—"}</td><td>${e.grossMargin ?? "—"}</td></tr>`).join("")}
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
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport F&amp;B</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rapport complet -- food cost, rentabilité, menu engineering, replay. Jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportHTML} disabled={!report}>
            Exporter HTML
          </Button>
          <Link to="/restaurant/menu-engineering"><Button variant="outline">← Menu Engineering</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du rapport…</p></Card>
      ) : !report ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer le rapport F&amp;B.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Food cost" value={report.foodCost?.overall !== null ? `${report.foodCost.overall}%` : "—"} trend={report.foodCost?.overall > 32 ? -1 : undefined} />
            <KpiCard label="Marge brute" value={report.profitability?.grossMargin !== null ? `${report.profitability.grossMargin}%` : "—"} />
            <KpiCard label="Marge nette" value={report.profitability?.netMargin !== null ? `${report.profitability.netMargin}%` : "—"} />
            <KpiCard label="Gaspillage" value={report.foodCost?.wastePct !== null ? `${report.foodCost.wastePct}%` : "—"} />
          </div>

          <Card title="Menu Engineering">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Quadrant</th>
                  <th className="pb-2 text-right">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.menuEngineering?.counts || {}).map(([key, value]) => (
                  <tr key={key}>
                    <td className="py-1 capitalize text-slate-700">{key}</td>
                    <td className="py-1 text-right font-medium text-slate-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

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
              title="Food cost par cycle"
              labels={trendLabels}
              data={replayEntries.map((e) => e.foodCost ?? 0)}
            />
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Cycle</th>
                      <th className="pb-2 pr-4">Période</th>
                      <th className="pb-2 pr-4">Food cost</th>
                      <th className="pb-2">Marge brute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replayEntries.map((entry) => (
                      <tr key={entry.cycleIndex} className="border-t border-slate-100">
                        <td className="py-1.5 pr-4 text-slate-600">{entry.cycleIndex + 1}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{entry.period ?? "—"}</td>
                        <td className="py-1.5 pr-4 font-medium text-slate-900">{entry.foodCost ?? "—"}%</td>
                        <td className="py-1.5 text-slate-700">{entry.grossMargin ?? "—"}%</td>
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

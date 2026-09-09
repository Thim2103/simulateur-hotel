import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// Route: /rm-advanced/report -- rapport RM avancé complet (compression,
// displacement, OTA strategy, pricing spécial, diagnostics détaillés,
// replay). Built on useRmAdvancedEngine.js's getRmAdvancedReport().
export default function RmAdvancedReport() {
  const { careerState } = useCareerContext();
  const { rmAdvancedState, isRunning, error, loadRmAdvancedState, getRmAdvancedReport } = useRmAdvancedEngine();

  useEffect(() => {
    loadRmAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue Management avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport RM avancé</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le rapport RM avancé.</p>
          </div>
        </header>
        <Card><Link to="/rm-advanced"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const report = rmAdvancedState ? getRmAdvancedReport() : null;
  const replayEntries = report?.replay?.entries || [];
  const trendLabels = replayEntries.map((e) => `Cycle ${e.cycleIndex + 1}`);

  const handleExportHTML = () => {
    if (!report) return;
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport RM avancé — Hospitality Lab</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem}h1,h2{color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}th{background:#f8fafc}ul{padding-left:1.2rem}</style>
</head>
<body>
<h1>Rapport RM avancé — Hospitality Lab</h1>
<p>Généré le ${new Date().toLocaleDateString("fr-FR")} | Période : ${report.period ?? "—"} | Cycles : ${report.replay.totalCycles}</p>
<h2>Compression &amp; Displacement</h2>
<table><tr><th>Indicateur</th><th>Valeur</th></tr>
<tr><td>Compression moyenne</td><td>${report.compression?.avgCompression ?? "—"}%</td></tr>
<tr><td>Dates à risque de surbooking</td><td>${report.compression?.highCompressionDates?.length ?? 0}</td></tr>
<tr><td>Displacement total</td><td>${report.displacement?.totalLoss ?? "—"} €</td></tr>
</table>
<h2>Stratégie OTA vs direct</h2>
<table><tr><th>Canal</th><th>Part</th></tr>
<tr><td>OTA</td><td>${report.otaStrategy?.otaShare ?? "—"}%</td></tr>
<tr><td>Direct</td><td>${report.otaStrategy?.directShare ?? "—"}%</td></tr>
</table>
<h2>Diagnostics</h2>
<ul>${(report.diagnostics || []).map((d) => `<li>[${d.severity}] ${d.message}</li>`).join("")}</ul>
<h2>Replay (${report.replay.totalCycles} cycles)</h2>
<table><tr><th>Cycle</th><th>Compression</th><th>Displacement</th><th>Part OTA</th></tr>
${replayEntries.map((e) => `<tr><td>${e.cycleIndex + 1}</td><td>${e.avgCompression ?? "—"}</td><td>${e.totalDisplacementLoss ?? "—"}</td><td>${e.otaShare ?? "—"}</td></tr>`).join("")}
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
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport RM avancé</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rapport complet -- compression, displacement, OTA, diagnostics, replay. Jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportHTML} disabled={!report}>
            Exporter HTML
          </Button>
          <Link to="/rm-advanced"><Button variant="outline">← Dashboard RM avancé</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du rapport…</p></Card>
      ) : !report ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer le rapport RM avancé.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Compression" value={report.compression?.avgCompression !== null ? `${report.compression.avgCompression}%` : "—"} trend={report.compression?.avgCompression >= 92 ? -1 : undefined} />
            <KpiCard label="Displacement" value={report.displacement?.totalLoss !== null ? `${report.displacement.totalLoss} €` : "—"} />
            <KpiCard label="Part OTA" value={report.otaStrategy?.otaShare !== null ? `${report.otaStrategy.otaShare}%` : "—"} />
            <KpiCard label="Part directe" value={report.otaStrategy?.directShare !== null ? `${report.otaStrategy.directShare}%` : "—"} />
          </div>

          <Card title="Pricing spécial">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Tarif corporate</dt>
              <dd className="font-medium text-slate-900">{report.specialPricing?.corporateRate ?? "—"} €</dd>
              <dt className="text-slate-500">Tarif premium</dt>
              <dd className="font-medium text-slate-900">{report.specialPricing?.premiumRate ?? "—"} €</dd>
              <dt className="text-slate-500">Tarif long séjour</dt>
              <dd className="font-medium text-slate-900">{report.specialPricing?.longStayRate ?? "—"} €</dd>
              <dt className="text-slate-500">Tarif événementiel</dt>
              <dd className="font-medium text-slate-900">{report.specialPricing?.eventRate ?? "—"} €</dd>
            </dl>
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
              title="Compression par cycle"
              labels={trendLabels}
              data={replayEntries.map((e) => e.avgCompression ?? 0)}
            />
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Cycle</th>
                      <th className="pb-2 pr-4">Période</th>
                      <th className="pb-2 pr-4">Compression</th>
                      <th className="pb-2">Part OTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replayEntries.map((entry) => (
                      <tr key={entry.cycleIndex} className="border-t border-slate-100">
                        <td className="py-1.5 pr-4 text-slate-600">{entry.cycleIndex + 1}</td>
                        <td className="py-1.5 pr-4 text-slate-600">{entry.period ?? "—"}</td>
                        <td className="py-1.5 pr-4 font-medium text-slate-900">{entry.avgCompression ?? "—"}%</td>
                        <td className="py-1.5 text-slate-700">{entry.otaShare ?? "—"}%</td>
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

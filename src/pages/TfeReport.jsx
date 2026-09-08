import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { exportTfeReportHtml, generateTfeReport } from "../lib/tfe/tfeReport";
import { analyzeTfeRun, buildTfeReplayRun } from "../lib/tfe/tfeEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// Route: /tfe/report -- "rapport final TFE / replay complet / analytics
// complet / export HTML" (section 1/4). Reuses lib/replay/replayEngine
// .js's buildReplayRunFromCareerRun()/lib/analytics/analyticsEngine.js's
// analyzeRun() over the TFE's own embedded career run (see
// lib/tfe/tfeEngine.js's buildTfeReplayRun()/analyzeTfeRun()) instead of
// maintaining a second, parallel replay/analytics system.
export default function TfeReport() {
  const { tfeState, isRunning, error, loadTfeState } = useTfeEngine();

  useEffect(() => {
    loadTfeState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = useMemo(() => generateTfeReport(tfeState), [tfeState]);
  const replayRun = useMemo(() => (tfeState ? buildTfeReplayRun(tfeState) : null), [tfeState]);
  const analysis = useMemo(() => (tfeState ? analyzeTfeRun(tfeState) : null), [tfeState]);

  const handleExport = () => {
    const html = exportTfeReportHtml(report);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isRunning && !tfeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport TFE…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">TFE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport final TFE</h1>
          <p className="mt-1 text-sm text-slate-500">{tfeState ? `${report.status === "completed" ? "Terminé" : "En cours"} -- mois ${report.monthsPlayed}/${report.horizonMonths}` : "Aucun TFE en cours."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!tfeState}>Exporter en HTML</Button>
          <Link to="/tfe/dashboard"><Button variant="outline">← Retour</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!tfeState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée TFE pour le moment. <Link to="/tfe" className="font-semibold text-cyan-700">Créer mon établissement →</Link></p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Score final">
              <p className="text-3xl font-bold text-slate-900">{report.finalScore?.total ?? "—"}/100</p>
              <p className="mt-1 text-sm text-slate-500">Mention : {report.grade ?? "—"}</p>
            </Card>
            <Card title="Établissement">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Positionnement : {report.hotelConfig?.positioningTier ?? "—"}</li>
                <li>Taille : {report.hotelConfig?.roomCount ?? "—"} chambres</li>
                <li>Stratégie : {report.hotelConfig?.strategy ?? "—"}</li>
              </ul>
            </Card>
            <Card title="Analytics (Replay Engine)">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Cycles rejoués : {replayRun?.cycles?.length ?? 0}</li>
                <li>Diagnostics Analytics : {analysis?.diagnostics?.length ?? 0}</li>
              </ul>
            </Card>
          </div>

          <section aria-labelledby="tfe-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="tfe-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics et recommandations</h2>
            <Card>
              {report.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.diagnostics.map((diagnostic, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diagnostic.message}</span>
                      <Badge type={SEVERITY_BADGE[diagnostic.severity] || "info"}>{diagnostic.type} · {diagnostic.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="tfe-replay" className="flex flex-col gap-3">
            <h2 id="tfe-replay" className="text-base font-semibold text-slate-900">Replay complet ({report.performanceHistory.length} mois)</h2>
            <Card>
              {report.performanceHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun mois joué.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {report.performanceHistory.map((entry) => (
                    <li key={entry.month} className="rounded-lg border border-slate-200 p-2">
                      Mois {entry.month} · Score {entry.score}/100 · Occupation {entry.occupancyRate}% · Risques {entry.risks} · Opportunités {entry.opportunities}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useMarketingEngine } from "../hooks/useMarketingEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const TIER_LABEL = { budget: "Budget", midscale: "Milieu de gamme", upscale: "Haut de gamme", luxury: "Luxe" };

// The full marketing report -- budget/ROI/conversion/segments/
// réputation/positionnement, diagnostics détaillés, and the Marketing
// module's own replay log (one entry per marketing cycle played, see
// lib/marketing/marketingEngine.js's runMarketingCycle()) -- the Refonte
// Marketing request's section 4, same structure as pages/FinanceReport
// .jsx/StaffReport.jsx.
export default function MarketingReport() {
  const { marketingState, isRunning, error, loadMarketingState, getMarketingReport } = useMarketingEngine();
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    loadMarketingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = getMarketingReport();
  const replayEntries = report.replay?.entries || [];
  const segments = report.segments?.counts || {};

  if (isRunning && !marketingState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport marketing…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport marketing complet</h1>
          <p className="mt-1 text-sm text-slate-500">{report.period ? `Période : ${report.period}` : "Aucun cycle marketing pour le moment."}</p>
        </div>
        <Link to="/marketing"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!marketingState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée marketing pour le moment. Visitez la page Marketing pour démarrer un cycle.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Budget & ROI">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Budget canaux : {report.budget.channel.toLocaleString()} €</li>
                <li>Budget campagnes : {report.budget.campaign.toLocaleString()} €</li>
                <li className="font-semibold">Budget total : {report.budget.total.toLocaleString()} €</li>
                <li className="font-semibold">ROI global : {report.roi.overallRoi}x</li>
                <li>Revenu généré : {report.roi.generatedRevenue.toLocaleString()} €</li>
              </ul>
            </Card>
            <Card title="Conversion & réputation">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Portée totale : {report.conversion.totalReach}</li>
                <li>Leads estimés : {report.conversion.estimatedLeads}</li>
                <li className="font-semibold">Taux de conversion : {report.conversion.conversionRate}%</li>
                <li className="font-semibold">Réputation : {report.reputation}/100</li>
                <li>Positionnement : {TIER_LABEL[report.positioningTier] || report.positioningTier}</li>
              </ul>
            </Card>
            <Card title="Segments & cross-selling">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Business : {segments.business ?? 0}</li>
                <li>Leisure : {segments.leisure ?? 0}</li>
                <li>Famille : {segments.famille ?? 0}</li>
                <li>Premium : {segments.premium ?? 0}</li>
                <li className="font-semibold">Cross-selling restaurant : {report.crossSelling ?? 0}%</li>
              </ul>
            </Card>
          </div>

          <section aria-labelledby="marketing-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="marketing-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics détaillés</h2>
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

          <section aria-labelledby="marketing-replay" className="flex flex-col gap-3">
            <h2 id="marketing-replay" className="text-base font-semibold text-slate-900">Replay marketing ({replayEntries.length} cycle{replayEntries.length > 1 ? "s" : ""})</h2>
            <Card>
              {replayEntries.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun cycle enregistré.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {replayEntries.map((entry) => (
                    <li key={entry.cycleIndex}>
                      <button
                        type="button"
                        onClick={() => setSelectedCycle(entry)}
                        className="w-full rounded-lg border border-slate-200 p-2 text-left hover:border-cyan-400"
                      >
                        Cycle {entry.cycleIndex + 1} · {entry.period} · ROI {entry.roi?.overallRoi}x · Réputation {entry.reputation}/100
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedCycle && (
                <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Cycle {selectedCycle.cycleIndex + 1} : budget {selectedCycle.budget?.total?.toLocaleString()} €, conversion {selectedCycle.conversion?.conversionRate}%, positionnement {TIER_LABEL[selectedCycle.positioningTier] || selectedCycle.positioningTier}.
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

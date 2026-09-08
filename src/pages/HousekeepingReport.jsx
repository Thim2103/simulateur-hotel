import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useHousekeepingEngine } from "../hooks/useHousekeepingEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// The full HK report -- charge/temps de nettoyage/productivité/
// surcharge/sous-effectif/qualité/coût, diagnostics détaillés, and the
// Housekeeping module's own replay log (one entry per HK cycle played,
// see lib/housekeeping/housekeepingEngine.js's runHousekeepingCycle())
// -- the Refonte Housekeeping request's section 4, same structure as
// pages/FinanceReport.jsx/StaffReport.jsx/MarketingReport.jsx/
// EsgReport.jsx.
export default function HousekeepingReport() {
  const { housekeepingState, isRunning, error, loadHousekeepingState, getHousekeepingReport } = useHousekeepingEngine();
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    loadHousekeepingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = getHousekeepingReport();
  const replayEntries = report.replay?.entries || [];
  const priorities = report.workload?.priorities || {};

  if (isRunning && !housekeepingState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport housekeeping…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Housekeeping</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport Housekeeping complet</h1>
          <p className="mt-1 text-sm text-slate-500">{report.period ? `Période : ${report.period}` : "Aucun cycle housekeeping pour le moment."}</p>
        </div>
        <Link to="/housekeeping"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!housekeepingState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée housekeeping pour le moment. Visitez la page Housekeeping pour démarrer un cycle.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Charge & priorités">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li className="font-semibold">Chambres à nettoyer : {report.workload.roomsToClean}</li>
                <li>Arrivées : {priorities.arrivals ?? 0}</li>
                <li>Départs : {priorities.departures ?? 0}</li>
                <li>Stayovers : {priorities.stayovers ?? 0}</li>
                <li>Temps total : {report.cleaningTime.totalMinutes} min ({report.cleaningTime.minutesPerRoom} min/chambre)</li>
              </ul>
            </Card>
            <Card title="Équipe & surcharge">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Effectif housekeeping : {report.housekeeperCount}</li>
                <li className="font-semibold">Productivité : {report.productivity}/100</li>
                <li className="font-semibold">Surcharge : {report.overload}%</li>
                <li>Sous-effectif : {report.understaffing.understaffed ? `oui (-${report.understaffing.shortfall} chambres)` : "non"}</li>
                <li>Coût mensuel estimé : {Number(report.cost).toLocaleString()} €</li>
              </ul>
            </Card>
            <Card title="Qualité">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li className="font-semibold text-lg">{report.quality}/100</li>
                <li>Score de propreté (cleanliness score), basé sur le rythme de nettoyage, la productivité et la satisfaction client.</li>
              </ul>
            </Card>
          </div>

          <section aria-labelledby="hk-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="hk-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics détaillés</h2>
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

          <section aria-labelledby="hk-replay" className="flex flex-col gap-3">
            <h2 id="hk-replay" className="text-base font-semibold text-slate-900">Replay Housekeeping ({replayEntries.length} cycle{replayEntries.length > 1 ? "s" : ""})</h2>
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
                        Cycle {entry.cycleIndex + 1} · {entry.period} · Charge {entry.roomsToClean} chambre(s) · Qualité {entry.quality}/100
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedCycle && (
                <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Cycle {selectedCycle.cycleIndex + 1} : surcharge {selectedCycle.overload}%, productivité {selectedCycle.productivity}/100.
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

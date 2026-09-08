import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useStaffEngine } from "../hooks/useStaffEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// The full HR report -- headcount/moral/productivité/absentéisme/
// surcharge/turnover/coûts RH, diagnostics détaillés, and the Staff
// module's own replay log (one entry per HR cycle played, see
// lib/staff/staffEngine.js's runStaffCycle()) -- the Refonte RH request's
// section 4, same structure as pages/FinanceReport.jsx.
export default function StaffReport() {
  const { staffState, isRunning, error, loadStaffState, getStaffReport } = useStaffEngine();
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    loadStaffState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = getStaffReport();
  const replayEntries = report.replay?.entries || [];

  if (isRunning && !staffState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport RH…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport RH complet</h1>
          <p className="mt-1 text-sm text-slate-500">{report.period ? `Période : ${report.period}` : "Aucun cycle RH pour le moment."}</p>
        </div>
        <Link to="/staff"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!staffState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée RH pour le moment. Visitez la page Staff pour démarrer un cycle.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Effectif & moral">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Effectif hôtel (estimation) : {report.headcount.hotel}</li>
                <li>Effectif restaurant : {report.headcount.restaurant}</li>
                <li className="font-semibold">Effectif total : {report.headcount.total}</li>
                <li className="font-semibold">Moral : {report.morale}/100</li>
                <li>Productivité : {report.productivity}/100</li>
              </ul>
            </Card>
            <Card title="Charge & absentéisme">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li className="font-semibold">Surcharge : {report.overload}%</li>
                <li>Charge housekeeping : {report.housekeepingLoad}%</li>
                <li>Charge service : {report.serviceLoad}%</li>
                <li className="font-semibold">Absentéisme : {report.absenteeism}%</li>
              </ul>
            </Card>
            <Card title="Turnover & coûts RH">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li className="font-semibold">Turnover estimé : {report.turnover.estimatedRate}%/mois</li>
                <li>Départs (dernier cycle) : {report.turnover.departuresLast}</li>
                <li>Masse salariale hôtel : {report.payroll.hotel.toLocaleString()} €</li>
                <li>Masse salariale restaurant : {report.payroll.restaurant.toLocaleString()} €</li>
                <li className="font-semibold">Masse salariale totale : {report.payroll.total.toLocaleString()} €</li>
              </ul>
            </Card>
          </div>

          <section aria-labelledby="staff-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="staff-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics détaillés</h2>
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

          <section aria-labelledby="staff-replay" className="flex flex-col gap-3">
            <h2 id="staff-replay" className="text-base font-semibold text-slate-900">Replay RH ({replayEntries.length} cycle{replayEntries.length > 1 ? "s" : ""})</h2>
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
                        Cycle {entry.cycleIndex + 1} · {entry.period} · Moral {entry.morale}/100 · Surcharge {entry.overload}%
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedCycle && (
                <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Cycle {selectedCycle.cycleIndex + 1} : effectif {selectedCycle.headcount.total}, productivité {selectedCycle.productivity}/100, absentéisme {selectedCycle.absenteeism}%, turnover estimé {selectedCycle.turnover.estimatedRate}%/mois.
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

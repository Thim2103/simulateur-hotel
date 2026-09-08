import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useEsgEngine } from "../hooks/useEsgEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// The full ESG report -- énergie/eau/déchets/CO₂/coûts/score/
// certifications, diagnostics détaillés, and the ESG module's own replay
// log (one entry per ESG cycle played, see lib/esg/esgEngine.js's
// runEsgCycle()) -- the Refonte ESG request's section 4, same structure
// as pages/FinanceReport.jsx/StaffReport.jsx/MarketingReport.jsx.
export default function EsgReport() {
  const { esgState, isRunning, error, loadEsgState, getEsgReport } = useEsgEngine();
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    loadEsgState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = getEsgReport();
  const replayEntries = report.replay?.entries || [];

  if (isRunning && !esgState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport ESG…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">ESG</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport ESG complet</h1>
          <p className="mt-1 text-sm text-slate-500">{report.period ? `Période : ${report.period}` : "Aucun cycle ESG pour le moment."}</p>
        </div>
        <Link to="/esg"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!esgState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée ESG pour le moment. Visitez la page ESG pour démarrer un cycle.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Consommation">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Énergie : {report.energy.toLocaleString()} kWh</li>
                <li>Eau : {report.water.toLocaleString()} m³</li>
                <li>Déchets : {report.waste.toLocaleString()} kg</li>
                <li className="font-semibold">CO₂ : {report.co2.toLocaleString()} kg</li>
              </ul>
            </Card>
            <Card title="Coûts & score">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Coût énergie : {report.costs.energy.toLocaleString()} €</li>
                <li>Coût eau : {report.costs.water.toLocaleString()} €</li>
                <li>Coût déchets : {report.costs.waste.toLocaleString()} €</li>
                <li className="font-semibold">Coût total : {report.costs.total.toLocaleString()} €</li>
                <li className="font-semibold">Score ESG : {report.score}/100</li>
              </ul>
            </Card>
            <Card title="Certifications">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                {report.certifications.map((certification) => (
                  <li key={certification.id} className="flex items-center justify-between">
                    <span>{certification.name}</span>
                    <Badge type={certification.obtained ? "success" : "info"}>{certification.obtained ? "Obtenue" : `${certification.progress}%`}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <section aria-labelledby="esg-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="esg-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics détaillés</h2>
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

          <section aria-labelledby="esg-replay" className="flex flex-col gap-3">
            <h2 id="esg-replay" className="text-base font-semibold text-slate-900">Replay ESG ({replayEntries.length} cycle{replayEntries.length > 1 ? "s" : ""})</h2>
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
                        Cycle {entry.cycleIndex + 1} · {entry.period} · Score {entry.score}/100 · CO₂ {entry.co2} kg
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedCycle && (
                <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Cycle {selectedCycle.cycleIndex + 1} : énergie {selectedCycle.energy} kWh, eau {selectedCycle.water} m³, déchets {selectedCycle.waste} kg.
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

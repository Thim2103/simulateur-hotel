import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import AreaChart from "../components/charts/AreaChart";
import { useProEngine } from "../hooks/useProEngine";
import { PRO_ACTION_CATALOG } from "../lib/pro/proEngine";
import { computePhaseProgress } from "../lib/pro/proMissions";
import { activeCrises } from "../lib/pro/proCrises";
import { availableOpportunities } from "../lib/pro/proOpportunities";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { croissance: "Croissance", rentabilite: "Rentabilité", rm: "RM", fb: "F&B", esg: "Durabilité", staff: "Équipe", marketing: "Marketing" };

// Route: /pro/dashboard -- the Mode Professionnel Solo's own command
// center, built on lib/pro/proEngine.js and hooks/useProEngine.js the
// same way pages/TfeDashboard.jsx is built on its own *Engine.js/
// use*Engine.js pair. "Mois suivant" advances the whole 24-month
// program by exactly one month.
export default function ProDashboard() {
  const { proState, isRunning, error, loadProState, playProMonth, applyProAction } = useProEngine();

  useEffect(() => {
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextMonth = async () => {
    try {
      await playProMonth();
    } catch {
      // error surfaced via `error`.
    }
  };

  const handleAction = async (actionId) => {
    try {
      await applyProAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if (isRunning && !proState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du mode professionnel…
        </span>
      </div>
    );
  }

  if (!proState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode Professionnel Solo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Professionnel</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun programme professionnel en cours.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Link to="/pro"><Button>Créer mon programme professionnel</Button></Link>
        </Card>
      </div>
    );
  }

  const diagnostics = proState.diagnostics || [];
  const history = proState.performanceHistory || [];
  const trendLabels = history.map((entry) => `Mois ${entry.month}`);
  const forecastMonths = proState.forecast?.scenarios?.realiste?.months || [];
  const phaseProgress = computePhaseProgress(Math.max(1, proState.month), proState.horizonMonths, proState.phases);
  const isCompleted = proState.status === "completed";
  const activeCrisesList = activeCrises(proState.crises);
  const availableOpportunitiesList = availableOpportunities(proState.opportunities);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tableau de bord professionnel</h1>
          <p className="mt-1 text-sm text-slate-500">Mois {proState.month}/{proState.horizonMonths} -- {phaseProgress.currentPhase?.title || "—"}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/pro/crises"><Button variant="outline">Crises</Button></Link>
          <Link to="/pro/opportunities"><Button variant="outline">Opportunités</Button></Link>
          <Link to="/pro/audits"><Button variant="outline">Audits</Button></Link>
          <Link to="/pro/objectives"><Button variant="outline">Objectifs</Button></Link>
          <Link to="/pro/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/pro/report"><Button variant="outline">Rapport</Button></Link>
          <Button onClick={handleNextMonth} disabled={isRunning || isCompleted}>
            {isCompleted ? "Programme terminé" : isRunning ? "Simulation…" : "Mois suivant →"}
          </Button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
      {isCompleted && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Programme terminé ! Consultez le rapport final pour votre score et vos résultats.</div>}

      {!proState.score ? (
        <Card><p className="text-sm text-slate-500">Cliquez sur "Mois suivant" pour lancer votre premier mois de simulation.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Performance globale" value={`${proState.score.total}/100 (${proState.score.grade})`} trend={proState.score.total >= 60 ? undefined : -1} />
            <KpiCard label="Crises actives" value={`${activeCrisesList.length}`} trend={activeCrisesList.length > 0 ? -1 : undefined} />
            <KpiCard label="Opportunités disponibles" value={`${availableOpportunitiesList.length}`} />
            <KpiCard label="Progression phase" value={`${phaseProgress.phaseProgress}%`} />
            <KpiCard label="Risques" value={`${history[history.length - 1]?.risks ?? 0}`} trend={history[history.length - 1]?.risks > 0 ? -1 : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart title="Performance mensuelle" labels={trendLabels} data={history.map((entry) => entry.score)} />
            <LineChart title="Score mensuel" labels={trendLabels} data={history.map((entry) => entry.score)} />
            <AreaChart title="Risques / opportunités" labels={trendLabels} data={history.map((entry) => entry.opportunities - entry.risks)} />
            <LineChart title="Prévision du score (24 mois)" labels={forecastMonths.map((entry) => `M${entry.month}`)} data={forecastMonths.map((entry) => entry.score)} />
          </div>

          <section aria-labelledby="pro-diagnostics" className="flex flex-col gap-3">
            <h2 id="pro-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics professionnels</h2>
            <Card>
              {diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diagnostics.map((diagnostic, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diagnostic.message}</span>
                      <Badge type={SEVERITY_BADGE[diagnostic.severity] || "info"}>{diagnostic.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="pro-actions" className="flex flex-col gap-3">
            <h2 id="pro-actions" className="text-base font-semibold text-slate-900">Actions professionnelles</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRO_ACTION_CATALOG.map((action) => (
                  <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction(action.id)} disabled={isRunning || isCompleted}>Appliquer</Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

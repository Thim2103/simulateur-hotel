import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import AreaChart from "../components/charts/AreaChart";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { TFE_ACTION_CATALOG } from "../lib/tfe/tfeEngine";
import { computeChapterProgress } from "../lib/tfe/tfeStoryline";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { croissance: "Croissance", rentabilite: "Rentabilité", esg: "Durabilité", staff: "Équipe", marketing: "Marketing" };

// Route: /tfe/dashboard -- the TFE Solo mode's own command center, built
// on lib/tfe/tfeEngine.js and hooks/useTfeEngine.js the same way every
// business dashboard in this app is built on its own *Engine.js/
// use*Engine.js pair. "Mois suivant" is the TFE equivalent of
// pages/Dashboard.jsx's "Jouer la journée" -- one click advances the
// whole 36-month run by exactly one month.
export default function TfeDashboard() {
  const { tfeState, isRunning, error, loadTfeState, playTfeMonth, applyTfeAction } = useTfeEngine();

  useEffect(() => {
    loadTfeState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNextMonth = async () => {
    try {
      await playTfeMonth();
    } catch {
      // error surfaced via `error`.
    }
  };

  const handleAction = async (actionId) => {
    try {
      await applyTfeAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if (isRunning && !tfeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du TFE…
        </span>
      </div>
    );
  }

  if (!tfeState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode TFE Solo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">TFE</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun TFE en cours.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Link to="/tfe"><Button>Créer mon établissement</Button></Link>
        </Card>
      </div>
    );
  }

  const diagnostics = tfeState.diagnostics || [];
  const history = tfeState.performanceHistory || [];
  const trendLabels = history.map((entry) => `Mois ${entry.month}`);
  const forecastMonths = tfeState.forecast?.scenarios?.realiste?.months || [];
  const chapterProgress = computeChapterProgress(Math.max(1, tfeState.month), tfeState.horizonMonths, tfeState.chapters);
  const isCompleted = tfeState.status === "completed";

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode TFE Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tableau de bord TFE</h1>
          <p className="mt-1 text-sm text-slate-500">Mois {tfeState.month}/{tfeState.horizonMonths} -- {chapterProgress.currentChapter?.title || "—"}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tfe/storyline"><Button variant="outline">Storyline</Button></Link>
          <Link to="/tfe/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/tfe/report"><Button variant="outline">Rapport</Button></Link>
          <Button onClick={handleNextMonth} disabled={isRunning || isCompleted}>
            {isCompleted ? "TFE terminé" : isRunning ? "Simulation…" : "Mois suivant →"}
          </Button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
      {isCompleted && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">TFE terminé ! Consultez le rapport final pour votre score et vos résultats.</div>}

      {!tfeState.score ? (
        <Card><p className="text-sm text-slate-500">Cliquez sur "Mois suivant" pour lancer votre premier mois de simulation.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Progression storyline" value={`${chapterProgress.overallProgress}%`} />
            <KpiCard label="Score TFE" value={`${tfeState.score.total}/100 (${tfeState.score.grade})`} trend={tfeState.score.total >= 60 ? undefined : -1} />
            <KpiCard label="Performance globale" value={`${history[history.length - 1]?.score ?? 0}/100`} />
            <KpiCard label="Risques" value={`${history[history.length - 1]?.risks ?? 0}`} trend={history[history.length - 1]?.risks > 0 ? -1 : undefined} />
            <KpiCard label="Opportunités" value={`${history[history.length - 1]?.opportunities ?? 0}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart title="Performance mensuelle" labels={trendLabels} data={history.map((entry) => entry.score)} />
            <LineChart title="Score mensuel" labels={trendLabels} data={history.map((entry) => entry.score)} />
            <AreaChart title="Risques / opportunités" labels={trendLabels} data={history.map((entry) => entry.opportunities - entry.risks)} />
            <LineChart title="Prévision du score (36 mois)" labels={forecastMonths.map((entry) => `M${entry.month}`)} data={forecastMonths.map((entry) => entry.score)} />
          </div>

          <section aria-labelledby="tfe-diagnostics" className="flex flex-col gap-3">
            <h2 id="tfe-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics TFE</h2>
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

          <section aria-labelledby="tfe-actions" className="flex flex-col gap-3">
            <h2 id="tfe-actions" className="text-base font-semibold text-slate-900">Actions TFE</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TFE_ACTION_CATALOG.map((action) => (
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

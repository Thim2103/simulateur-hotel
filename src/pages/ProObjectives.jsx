import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useProEngine } from "../hooks/useProEngine";
import { objectivesProgress } from "../lib/pro/proObjectives";
import { computePhaseProgress } from "../lib/pro/proMissions";

// Route: /pro/objectives -- objectifs professionnels multi-départements
// et missions par phase, avec leur progression. Built on the same
// useProEngine.js as ProDashboard.jsx.
export default function ProObjectives() {
  const { proState, error, loadProState } = useProEngine();

  useEffect(() => {
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!proState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode Professionnel Solo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Objectifs</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun programme professionnel en cours.</p>
          </div>
        </header>
        <Card><Link to="/pro"><Button>Créer mon programme professionnel</Button></Link></Card>
      </div>
    );
  }

  const objectives = proState.objectives || [];
  const missions = proState.missions || [];
  const phaseProgress = computePhaseProgress(Math.max(1, proState.month), proState.horizonMonths, proState.phases);
  const progress = objectivesProgress(objectives);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Objectifs &amp; missions</h1>
          <p className="mt-1 text-sm text-slate-500">{phaseProgress.currentPhase?.title || "—"} -- mois {proState.month}/{proState.horizonMonths}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pro/dashboard"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Objectifs atteints" value={`${progress}%`} />
        <KpiCard label="Progression phase" value={`${phaseProgress.phaseProgress}%`} />
        <KpiCard label="Progression globale" value={`${phaseProgress.overallProgress}%`} />
      </div>

      <Card title="Objectifs professionnels (multi-départements)">
        <ul className="flex flex-col gap-2">
          {objectives.map((objective) => (
            <li key={objective.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <span>{objective.label}</span>
              <Badge type={objective.achieved ? "success" : "info"}>{objective.achieved ? "atteint" : "en cours"}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Missions professionnelles">
        <ul className="flex flex-col gap-2">
          {missions.map((mission) => (
            <li key={mission.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{mission.title}</p>
                <p className="mt-1 text-xs text-slate-500">{mission.description}</p>
              </div>
              <Badge type={mission.achieved ? "success" : "info"}>{mission.achieved ? `atteint (mois ${mission.completedOnMonth})` : "en cours"}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Phases">
        <ul className="flex flex-col gap-2 text-sm">
          {(proState.phases || []).map((phase) => (
            <li key={phase.id} className={`rounded-lg border p-2 ${phaseProgress.currentPhase?.id === phase.id ? "border-cyan-300 bg-cyan-50" : "border-slate-200"}`}>
              {phase.title} <span className="text-slate-500">(mois {phase.startMonth}-{phase.endMonth})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

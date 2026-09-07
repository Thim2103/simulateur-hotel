import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useCareerContext } from "../context/CareerContext";
import { skillLabel } from "../lib/career/careerSkills";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

export default function CareerDashboard() {
  const { careerState, isRunning, error, loadCareerState, startCareer } = useCareerContext();

  useEffect(() => {
    loadCareerState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRunning && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement de votre carrière…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode Carrière</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Commencez votre carrière</h1>
            <p className="mt-1 text-sm text-slate-500">Prenez la direction de votre établissement et progressez jour après jour.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button onClick={() => startCareer("moi").catch(() => undefined)} disabled={isRunning}>
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const acceptedMissions = careerState.missions.filter((mission) => mission.status === "accepted");
  const completedMissionsCount = careerState.missions.filter((mission) => mission.status === "completed").length;
  const achievedObjectivesCount = careerState.objectives.filter((objective) => objective.achieved).length;
  const insights = careerState.lastAnalysis;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Vue globale</h1>
          <p className="mt-1 text-sm text-slate-500">Jour {careerState.day} · Statut : {careerState.status}</p>
        </div>
        <Link to="/career/next-day" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Jour suivant →</Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {careerState.storyline.currentEventId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Un événement narratif vous attend. <Link to="/career/story" className="font-semibold underline">Le consulter →</Link>
        </div>
      )}

      <section aria-labelledby="career-progression" className="flex flex-col gap-3">
        <h2 id="career-progression" className="text-base font-semibold text-slate-900">Progression</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Missions en cours" value={acceptedMissions.length} />
          <KpiCard label="Missions terminées" value={completedMissionsCount} />
          <KpiCard label="Objectifs atteints" value={`${achievedObjectivesCount}/${careerState.objectives.length}`} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section aria-labelledby="career-missions" className="flex flex-col gap-3">
          <h2 id="career-missions" className="text-base font-semibold text-slate-900">Missions en cours</h2>
          <Card>
            {acceptedMissions.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune mission en cours. <Link to="/career/missions" className="font-semibold text-cyan-700">En accepter une →</Link></p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {acceptedMissions.map((mission) => (
                  <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title}</li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="career-skills" className="flex flex-col gap-3">
          <h2 id="career-skills" className="text-base font-semibold text-slate-900">Compétences</h2>
          <Card>
            <ul className="flex flex-col gap-2 text-sm">
              {Object.entries(careerState.skills).map(([skillId, skill]) => (
                <li key={skillId} className="flex justify-between rounded-lg border border-slate-200 p-2">
                  <span className="font-medium text-slate-900">{skillLabel(skillId)}</span>
                  <span className="text-slate-600">Niveau {skill.level}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      <section aria-labelledby="career-rewards" className="flex flex-col gap-3">
        <h2 id="career-rewards" className="text-base font-semibold text-slate-900">Récompenses en attente</h2>
        <Card>
          {careerState.rewardsInbox.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune récompense en attente.</p>
          ) : (
            <p className="text-sm text-slate-700">{careerState.rewardsInbox.length} récompense(s) à réclamer. <Link to="/career/rewards" className="font-semibold text-cyan-700">Voir →</Link></p>
          )}
        </Card>
      </section>

      {insights && (
        <section aria-labelledby="career-insights" className="flex flex-col gap-3">
          <h2 id="career-insights" className="text-base font-semibold text-slate-900">Insights (Analytics)</h2>
          <Card>
            {insights.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">Rien à signaler pour le moment.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {insights.recommendations.slice(0, 3).map((recommendation, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <span className="text-slate-700">{recommendation.text}</span>
                    <Badge type={SEVERITY_BADGE[recommendation.severity] || "info"}>{recommendation.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}

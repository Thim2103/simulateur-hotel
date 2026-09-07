import { useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useProgression } from "../hooks/useProgression";

const REWARD_LABEL = { xp: "XP", capital: "Capital" };

function ProgressBar({ value }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-cyan-700 transition-all duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

function EmptyList({ children }) {
  return <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">{children}</p>;
}

// Player progression: reputation, XP/level, today's completed objectives,
// newly-unlocked achievements, rewards, and storyline beats -- all produced
// by lib/progression/progressionEngine.js (the same engine runDailyCycle()
// runs once a day; this page lets you preview it on demand).
export default function ProgressionDashboard() {
  const { updateProgression, progressionReport, isRunning, error } = useProgression();

  useEffect(() => {
    updateProgression().catch(() => undefined); // surfaced via `error` below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Progression du joueur</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Réputation, niveau & succès</h1>
          <p className="mt-1 text-sm text-slate-500">Réputation, expérience, objectifs, succès, récompenses et fil narratif de votre établissement.</p>
        </div>
        <Button onClick={() => updateProgression().catch(() => undefined)} disabled={isRunning}>
          {isRunning ? "Calcul en cours…" : "Rafraîchir"}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Impossible de calculer la progression : {error.message}
        </div>
      )}

      {!progressionReport && !error && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {isRunning ? "Calcul de la progression en cours…" : "Aucune donnée de progression disponible pour le moment."}
        </div>
      )}

      {progressionReport && (
        <>
          <section aria-labelledby="progression-overview" className="flex flex-col gap-3">
            <h2 id="progression-overview" className="text-base font-semibold text-slate-900">Vue d'ensemble</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Réputation" value={`${progressionReport.reputation}/100`} />
              <KpiCard label="Expérience (XP)" value={progressionReport.xp.toLocaleString()} />
              <KpiCard label="Niveau" value={`${progressionReport.level.level} · ${progressionReport.level.title}`} />
            </div>
            {progressionReport.level.xpForNextLevel !== null && (
              <Card title="Progression vers le niveau suivant">
                <ProgressBar value={progressionReport.level.progress} />
                <p className="mt-2 text-xs text-slate-500">
                  {progressionReport.level.xpToNextLevel.toLocaleString()} XP restants avant le prochain niveau.
                </p>
              </Card>
            )}
          </section>

          <section aria-labelledby="progression-objectives" className="flex flex-col gap-3">
            <h2 id="progression-objectives" className="text-base font-semibold text-slate-900">Objectifs du jour</h2>
            <Card>
              {progressionReport.objectivesCompleted.length ? (
                <ul className="space-y-2">
                  {progressionReport.objectivesCompleted.map((objective) => (
                    <li key={objective.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{objective.name}</p>
                      <p className="text-xs text-slate-500">{objective.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucun objectif complété aujourd'hui.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="progression-achievements" className="flex flex-col gap-3">
            <h2 id="progression-achievements" className="text-base font-semibold text-slate-900">Nouveaux succès</h2>
            <Card>
              {progressionReport.newAchievements.length ? (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {progressionReport.newAchievements.map((achievement) => (
                    <li key={achievement.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-800">🏆 {achievement.name}</p>
                      <p className="text-xs text-amber-700">{achievement.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucun nouveau succès aujourd'hui.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="progression-rewards" className="flex flex-col gap-3">
            <h2 id="progression-rewards" className="text-base font-semibold text-slate-900">Récompenses</h2>
            <Card>
              {progressionReport.rewards.length ? (
                <ul className="space-y-2">
                  {progressionReport.rewards.map((reward) => (
                    <li key={reward.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <span className="text-sm text-slate-700">{reward.description}</span>
                      <Badge type="success">{REWARD_LABEL[reward.type] || reward.type}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucune récompense aujourd'hui.</EmptyList>
              )}
            </Card>
          </section>

          <section aria-labelledby="progression-storyline" className="flex flex-col gap-3">
            <h2 id="progression-storyline" className="text-base font-semibold text-slate-900">Fil narratif</h2>
            <Card>
              {progressionReport.storylineEvents.length ? (
                <ul className="space-y-2">
                  {progressionReport.storylineEvents.map((event) => (
                    <li key={event.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyList>Aucun événement narratif aujourd'hui.</EmptyList>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

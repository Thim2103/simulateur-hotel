import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { computeChapterProgress } from "../lib/tfe/tfeStoryline";

// Route: /tfe/storyline -- "chapitres / missions / objectifs /
// progression" (section 4). Groups the TFE's own fixed 3-chapter
// storyline (see lib/tfe/tfeStoryline.js's TFE_CHAPTER_CATALOG) and
// shows each mission/objective's progress against it.
export default function TfeStoryline() {
  const { tfeState, isRunning, error, loadTfeState } = useTfeEngine();

  useEffect(() => {
    loadTfeState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRunning && !tfeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement de la storyline…
        </span>
      </div>
    );
  }

  if (!tfeState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">TFE</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Storyline</h1>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card><p className="text-sm text-slate-500">Aucun TFE en cours. <Link to="/tfe" className="font-semibold text-cyan-700">Créer mon établissement →</Link></p></Card>
      </div>
    );
  }

  const chapters = tfeState.chapters || [];
  const missions = tfeState.missions || [];
  const objectives = tfeState.objectives || [];
  const chapterProgress = computeChapterProgress(Math.max(1, tfeState.month), tfeState.horizonMonths, chapters);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">TFE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Storyline</h1>
          <p className="mt-1 text-sm text-slate-500">Progression globale : {chapterProgress.overallProgress}%.</p>
        </div>
        <Link to="/tfe/dashboard"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="flex flex-col gap-4">
        {chapters.map((chapter) => {
          const isCurrent = chapterProgress.currentChapter?.id === chapter.id;
          const chapterMissions = missions.filter((mission) => mission.chapterId === chapter.id);
          return (
            <Card key={chapter.id} title={chapter.title}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Mois {chapter.startMonth} à {chapter.endMonth}</span>
                  <Badge type={isCurrent ? "info" : chapterProgress.overallProgress >= 100 || tfeState.month >= chapter.endMonth ? "success" : "info"}>
                    {isCurrent ? "En cours" : tfeState.month >= chapter.endMonth ? "Terminé" : "À venir"}
                  </Badge>
                </div>
                {isCurrent && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-cyan-600 transition-all duration-300" style={{ width: `${chapterProgress.chapterProgress}%` }} />
                  </div>
                )}
                <ul className="flex flex-col gap-2 text-sm">
                  {chapterMissions.map((mission) => (
                    <li key={mission.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                      <div>
                        <p className="font-medium text-slate-900">{mission.title}</p>
                        <p className="text-xs text-slate-500">{mission.description}</p>
                      </div>
                      <Badge type={mission.achieved ? "success" : "info"}>{mission.achieved ? `Réussie (mois ${mission.completedOnMonth})` : "En cours"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="tfe-objectives" className="flex flex-col gap-3">
        <h2 id="tfe-objectives" className="text-base font-semibold text-slate-900">Objectifs (toujours actifs)</h2>
        <Card>
          <ul className="flex flex-col gap-2 text-sm">
            {objectives.map((objective) => (
              <li key={objective.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                <span>{objective.label}</span>
                <Badge type={objective.achieved ? "success" : "info"}>{objective.achieved ? "atteint" : "en cours"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useCompetitionContext } from "../context/CompetitionContext";
import { findPlayer, runForPlayer } from "../lib/competition";
import { buildPlayerReport } from "../lib/competition/competitionReports";

export default function CompetitionPlayer() {
  const { matchId, playerId } = useParams();
  const { competitionState, isRunning, error, loadCompetitionState, runCompetitionCycle } = useCompetitionContext();

  useEffect(() => {
    loadCompetitionState(matchId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const player = findPlayer(competitionState, playerId);
  const run = runForPlayer(competitionState, playerId);
  const report = buildPlayerReport(player || { id: playerId, name: "Joueur" }, run);

  const handlePlayCycle = () => {
    runCompetitionCycle(matchId, playerId, {}).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Compétition</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{report.playerName}</h1>
          <p className="mt-1 text-sm text-slate-500">Cycle {report.cycleIndex}/{report.totalCycles} · Statut : {report.status}</p>
        </div>
        <Button onClick={handlePlayCycle} disabled={isRunning || report.status !== "running"}>
          {isRunning ? "Calcul en cours…" : "Jouer un cycle"}
        </Button>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {report.status === "not_started" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Aucun scénario n'a encore été assigné à cette compétition.
        </div>
      ) : (
        <>
          <section aria-labelledby="player-kpis" className="flex flex-col gap-3">
            <h2 id="player-kpis" className="text-base font-semibold text-slate-900">Scoring</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Score actuel" value={report.currentScore ?? "—"} />
              <KpiCard label="Cycles joués" value={`${report.cycleIndex}/${report.totalCycles}`} />
              <KpiCard label="Objectifs atteints" value={`${report.objectives.filter((o) => o.achieved).length}/${report.objectives.length}`} />
            </div>
          </section>

          <section aria-labelledby="player-objectives" className="flex flex-col gap-3">
            <h2 id="player-objectives" className="text-base font-semibold text-slate-900">Objectifs</h2>
            <Card>
              {report.objectives.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun objectif défini pour ce scénario.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.objectives.map((objective) => (
                    <li key={objective.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="font-medium text-slate-900">{objective.label || objective.id}</span>
                      <span className="flex items-center gap-2 text-slate-600">
                        {objective.current ?? "—"} / {objective.target}
                        <Badge type={objective.achieved ? "success" : "danger"}>{objective.achieved ? "Atteint" : "Non atteint"}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="player-daily-reports" className="flex flex-col gap-3">
            <h2 id="player-daily-reports" className="text-base font-semibold text-slate-900">Rapports journaliers</h2>
            <Card>
              {report.dailyReports.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun cycle joué pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.dailyReports.map((entry) => (
                    <li key={entry.cycleIndex} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="font-medium text-slate-900">Cycle {entry.cycleIndex + 1} · {entry.baseReport?.date}</span>
                      <span className="text-slate-600">Score {entry.score} · {entry.scenarioEvents?.length || 0} événement(s)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

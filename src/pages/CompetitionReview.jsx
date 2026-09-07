import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useCompetitionContext } from "../context/CompetitionContext";
import { listPlayersForMatch } from "../lib/competition";
import { buildReplay, replayCycle } from "../lib/scenario/scenarioReplay";

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CompetitionReview() {
  const { matchId } = useParams();
  const { competitionState, isRunning, error, loadCompetitionState, generateFinalRanking } = useCompetitionContext();
  const [ranking, setRanking] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    loadCompetitionState(matchId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const players = listPlayersForMatch(competitionState, matchId);
  const activePlayerId = selectedPlayerId || players[0]?.id || null;
  const activeRun = competitionState.runsByPlayerId[activePlayerId];
  const replay = useMemo(() => buildReplay(activeRun?.replayLog), [activeRun]);
  const selectedCycle = replayCycle(replay, cycleIndex);

  const handleGenerate = async () => {
    try {
      const result = await generateFinalRanking(matchId);
      setRanking(result);
    } catch {
      // error surfaced via `error`.
    }
  };

  const evaluations = ranking
    ? players.map((player) => ({ player, evaluation: competitionState.reportsByPlayerId[player.id] || null }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Compétition</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Classement final</h1>
          <p className="mt-1 text-sm text-slate-500">Comparaison détaillée, replay des décisions et export.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={isRunning}>{isRunning ? "Calcul…" : "Générer le classement final"}</Button>
          {ranking && <Button variant="secondary" onClick={() => downloadJson(`classement-${matchId}.json`, ranking)}>Exporter (JSON)</Button>}
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!ranking ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cliquez sur « Générer le classement final » pour noter chaque joueur et clôturer la compétition.
        </div>
      ) : (
        <>
          <section aria-labelledby="review-summary" className="flex flex-col gap-3">
            <h2 id="review-summary" className="text-base font-semibold text-slate-900">Podium</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="1er" value={ranking[0]?.playerName || "—"} />
              <KpiCard label="Score du 1er" value={ranking[0]?.currentScore ?? "—"} />
              <KpiCard label="Joueurs classés" value={ranking.length} />
            </div>
          </section>

          <section aria-labelledby="review-ranking" className="flex flex-col gap-3">
            <h2 id="review-ranking" className="text-base font-semibold text-slate-900">Classement</h2>
            <Card>
              <ol className="flex flex-col gap-2">
                {ranking.map((entry) => (
                  <li key={entry.playerId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                    <span className="font-semibold text-slate-900">#{entry.rank} · {entry.playerName}</span>
                    <span className="text-slate-600">Score {entry.currentScore ?? "—"}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section aria-labelledby="review-grades" className="flex flex-col gap-3">
            <h2 id="review-grades" className="text-base font-semibold text-slate-900">Évaluations par joueur</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {evaluations.map(({ player, evaluation }) => (
                <Card key={player.id} title={player.name}>
                  {evaluation ? (
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge type={evaluation.passed ? "success" : "danger"}>{evaluation.grade} · {evaluation.gradeLabel}</Badge>
                        <span className="text-slate-600">Score {evaluation.finalScore}</span>
                      </div>
                      {evaluation.recommendations?.map((recommendation) => (
                        <p key={recommendation} className="text-xs text-slate-500">{recommendation}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Joueur pas encore évalué.</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="review-replay" className="flex flex-col gap-3">
        <h2 id="review-replay" className="text-base font-semibold text-slate-900">Replay des décisions</h2>
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                Joueur
                <select
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                  value={activePlayerId || ""}
                  onChange={(event) => { setSelectedPlayerId(event.target.value); setCycleIndex(0); }}
                >
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </label>
              {replay.totalCycles > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  Cycle
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, replay.totalCycles - 1)}
                    value={cycleIndex}
                    onChange={(event) => setCycleIndex(Number(event.target.value))}
                  />
                  <span className="text-slate-600">{cycleIndex + 1}/{replay.totalCycles}</span>
                </label>
              )}
            </div>

            {selectedCycle ? (
              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Cycle {selectedCycle.cycleIndex + 1} · {selectedCycle.baseReport?.date}</p>
                <p className="mt-1 text-slate-600">Score : {selectedCycle.score} · Événements : {selectedCycle.scenarioEvents?.length || 0}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun cycle joué pour ce joueur.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

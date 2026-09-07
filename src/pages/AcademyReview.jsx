import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useAcademyContext } from "../context/AcademyContext";
import { listGroupsForClass } from "../lib/academy";
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

export default function AcademyReview() {
  const { classId } = useParams();
  const { academyState, isRunning, error, loadClassState, generateFinalReport } = useAcademyContext();
  const [finalReport, setFinalReport] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    loadClassState(classId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const groups = listGroupsForClass(academyState, classId);
  const activeGroupId = selectedGroupId || groups[0]?.id || null;
  const activeRun = academyState.runsByGroupId[activeGroupId];
  const replay = useMemo(() => buildReplay(activeRun?.replayLog), [activeRun]);
  const selectedCycle = replayCycle(replay, cycleIndex);

  const handleGenerate = async () => {
    try {
      const report = await generateFinalReport(classId);
      setFinalReport(report);
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Académie</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport final de classe</h1>
          <p className="mt-1 text-sm text-slate-500">Comparaison détaillée, replay des décisions et export.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={isRunning}>{isRunning ? "Génération…" : "Générer le rapport final"}</Button>
          {finalReport && <Button variant="secondary" onClick={() => downloadJson(`rapport-${classId}.json`, finalReport)}>Exporter (JSON)</Button>}
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!finalReport ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cliquez sur « Générer le rapport final » pour noter chaque groupe et comparer la classe.
        </div>
      ) : (
        <>
          <section aria-labelledby="review-summary" className="flex flex-col gap-3">
            <h2 id="review-summary" className="text-base font-semibold text-slate-900">Résumé de la classe</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Score moyen" value={finalReport.classAverageScore} />
              <KpiCard label="Groupes terminés" value={`${finalReport.completedCount}/${finalReport.groupCount}`} />
              <KpiCard label="Meilleur groupe" value={finalReport.bestGroup?.groupName || "—"} />
            </div>
          </section>

          <section aria-labelledby="review-ranking" className="flex flex-col gap-3">
            <h2 id="review-ranking" className="text-base font-semibold text-slate-900">Classement</h2>
            <Card>
              <ol className="flex flex-col gap-2">
                {finalReport.ranking.map((entry) => (
                  <li key={entry.groupId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                    <span className="font-semibold text-slate-900">#{entry.rank} · {entry.groupName}</span>
                    <span className="text-slate-600">Score {entry.currentScore ?? "—"}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section aria-labelledby="review-grades" className="flex flex-col gap-3">
            <h2 id="review-grades" className="text-base font-semibold text-slate-900">Évaluations par groupe</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {finalReport.groupReports.map((entry) => (
                <Card key={entry.groupId} title={entry.groupName}>
                  {entry.evaluation ? (
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge type={entry.evaluation.passed ? "success" : "danger"}>{entry.evaluation.grade} · {entry.evaluation.gradeLabel}</Badge>
                        <span className="text-slate-600">Score {entry.evaluation.finalScore}</span>
                      </div>
                      {entry.evaluation.recommendations.map((recommendation) => (
                        <p key={recommendation} className="text-xs text-slate-500">{recommendation}</p>
                      ))}
                      <Link to={`/replay/academie-${classId}-${entry.groupId}`} className="text-xs font-semibold text-cyan-700 hover:text-cyan-800">Voir le replay →</Link>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Groupe pas encore évalué.</p>
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
                Groupe
                <select
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                  value={activeGroupId || ""}
                  onChange={(event) => { setSelectedGroupId(event.target.value); setCycleIndex(0); }}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
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
              <p className="text-sm text-slate-500">Aucun cycle joué pour ce groupe.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

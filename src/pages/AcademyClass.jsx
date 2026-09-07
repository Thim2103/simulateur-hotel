import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { useAcademyContext } from "../context/AcademyContext";
import { findClass, listGroupsForClass } from "../lib/academy";
import { compareGroups } from "../lib/academy/academyComparison";
import { academyExampleScenarios } from "../lib/scenario/examples";

const STATUS_BADGE = { running: "info", finished: "success", not_started: "warning" };

export default function AcademyClass() {
  const { classId } = useParams();
  const { academyState, isRunning, error, loadClassState, createGroup, assignScenario, loadScenarioProgress } = useAcademyContext();
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState(academyExampleScenarios[0].id);

  useEffect(() => {
    loadClassState(classId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const classEntry = findClass(academyState, classId);
  const groups = listGroupsForClass(academyState, classId);
  const progress = loadScenarioProgress(classId);
  const comparison = useMemo(() => compareGroups(groups, academyState.runsByGroupId), [groups, academyState.runsByGroupId]);
  const latestAssignment = [...academyState.assignments].reverse().find((entry) => entry.classId === classId);

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await createGroup(classId, newGroupName.trim());
      setNewGroupName("");
    } catch {
      // error surfaced via `error`.
    }
  };

  const handleAssignScenario = async () => {
    const scenario = academyExampleScenarios.find((entry) => entry.id === selectedScenarioId);
    if (!scenario) return;
    try {
      await assignScenario(classId, scenario);
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Académie</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{classEntry?.name || "Classe"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {latestAssignment ? `Scénario assigné : ${latestAssignment.scenario?.title}` : "Aucun scénario assigné pour le moment."}
          </p>
        </div>
        <Link to={`/academy/${classId}/review`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Rapport final →</Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Créer un groupe">
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Nom du groupe" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Ex : Groupe 1" />
            </div>
            <Button type="submit" disabled={isRunning || !newGroupName.trim()}>Ajouter</Button>
          </form>
        </Card>

        <Card title="Assigner un scénario">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">Scénario</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                value={selectedScenarioId}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
              >
                {academyExampleScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
                ))}
              </select>
            </label>
            <Button onClick={handleAssignScenario} disabled={isRunning || groups.length === 0}>Assigner à la classe</Button>
          </div>
          {groups.length === 0 && <p className="mt-2 text-xs text-slate-500">Créez au moins un groupe avant d'assigner un scénario.</p>}
        </Card>
      </div>

      <section aria-labelledby="academy-progress" className="flex flex-col gap-3">
        <h2 id="academy-progress" className="text-base font-semibold text-slate-900">Suivi des groupes</h2>
        {progress.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Aucun groupe pour le moment.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Groupe</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {progress.map((entry) => (
                  <tr key={entry.groupId}>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.groupName}</td>
                    <td className="px-4 py-3"><Badge type={STATUS_BADGE[entry.status] || "info"}>{entry.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{entry.cycleIndex}/{entry.totalCycles}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.currentScore ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/academy/${classId}/group/${entry.groupId}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Ouvrir →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="academy-comparison" className="flex flex-col gap-3">
        <h2 id="academy-comparison" className="text-base font-semibold text-slate-900">Comparaison des groupes</h2>
        <Card>
          {comparison.length === 0 ? (
            <p className="text-sm text-slate-500">Rien à comparer pour le moment.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {comparison.map((entry) => (
                <li key={entry.groupId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="font-semibold text-slate-900">#{entry.rank} · {entry.groupName}</span>
                  <span className="text-slate-600">Score {entry.currentScore ?? "—"} · Objectifs {entry.objectivesAchieved}/{entry.objectivesTotal}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}

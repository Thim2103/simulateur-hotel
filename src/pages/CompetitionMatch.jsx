import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { useCompetitionContext } from "../context/CompetitionContext";
import { findMatch, listPlayersForMatch, rankPlayers } from "../lib/competition";
import { competitionExampleScenarios } from "../lib/scenario/examples";

const STATUS_BADGE = { running: "info", finished: "success", not_started: "warning" };

export default function CompetitionMatch() {
  const { matchId } = useParams();
  const { competitionState, isRunning, error, loadCompetitionState, registerPlayer, assignScenario } = useCompetitionContext();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState(competitionExampleScenarios[0].id);

  useEffect(() => {
    loadCompetitionState(matchId).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const match = findMatch(competitionState, matchId);
  const players = listPlayersForMatch(competitionState, matchId);
  const ranking = useMemo(() => rankPlayers(players, competitionState.runsByPlayerId), [players, competitionState.runsByPlayerId]);

  const handleRegisterPlayer = async (event) => {
    event.preventDefault();
    if (!newPlayerName.trim()) return;
    try {
      await registerPlayer(matchId, newPlayerName.trim());
      setNewPlayerName("");
    } catch {
      // error surfaced via `error`.
    }
  };

  const handleAssignScenario = async () => {
    const scenario = competitionExampleScenarios.find((entry) => entry.id === selectedScenarioId);
    if (!scenario) return;
    try {
      await assignScenario(matchId, scenario);
    } catch {
      // error surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Compétition</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{match?.name || "Compétition"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {match?.scenario ? `Scénario : ${match.scenario.title} · Seed partagée : ${match.scenario.replay?.seed}` : "Aucun scénario assigné pour le moment."}
          </p>
        </div>
        <Link to={`/competition/${matchId}/review`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Classement final →</Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Inscrire un joueur">
          <form onSubmit={handleRegisterPlayer} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Nom du joueur" value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Ex : Joueur 1" />
            </div>
            <Button type="submit" disabled={isRunning || !newPlayerName.trim()}>Inscrire</Button>
          </form>
        </Card>

        <Card title="Assigner le scénario commun">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700">Scénario</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                value={selectedScenarioId}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
              >
                {competitionExampleScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
                ))}
              </select>
            </label>
            <Button onClick={handleAssignScenario} disabled={isRunning || players.length === 0}>Lancer la compétition</Button>
          </div>
          {players.length === 0 && <p className="mt-2 text-xs text-slate-500">Inscrivez au moins un joueur avant d'assigner le scénario.</p>}
        </Card>
      </div>

      <section aria-labelledby="competition-players" className="flex flex-col gap-3">
        <h2 id="competition-players" className="text-base font-semibold text-slate-900">Joueurs</h2>
        {players.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Aucun joueur inscrit pour le moment.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Joueur</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {players.map((player) => {
                  const run = competitionState.runsByPlayerId[player.id];
                  return (
                    <tr key={player.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{player.name}</td>
                      <td className="px-4 py-3"><Badge type={STATUS_BADGE[run?.status || "not_started"]}>{run?.status || "not_started"}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/competition/${matchId}/player/${player.id}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">Ouvrir →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="competition-ranking" className="flex flex-col gap-3">
        <h2 id="competition-ranking" className="text-base font-semibold text-slate-900">Classement provisoire</h2>
        <Card>
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500">Rien à classer pour le moment.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {ranking.map((entry) => (
                <li key={entry.playerId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="font-semibold text-slate-900">#{entry.rank} · {entry.playerName}</span>
                  <span className="text-slate-600">Score {entry.currentScore ?? "—"}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}

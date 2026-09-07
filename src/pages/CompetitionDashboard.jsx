import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useCompetitionContext } from "../context/CompetitionContext";

// Organizer's entry point: list of competitions ("matches"), create a new
// one, jump into a match's players/scenario/ranking. See
// CompetitionMatch.jsx for registering players and assigning the shared
// scenario.
export default function CompetitionDashboard() {
  const { competitionState, isRunning, error, loadCompetitionState, createCompetition } = useCompetitionContext();
  const [newMatchName, setNewMatchName] = useState("");

  useEffect(() => {
    loadCompetitionState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateMatch = async (event) => {
    event.preventDefault();
    if (!newMatchName.trim()) return;
    try {
      await createCompetition(newMatchName.trim());
      setNewMatchName("");
    } catch {
      // error is already surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Compétition</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mes compétitions</h1>
          <p className="mt-1 text-sm text-slate-500">Créez une compétition, inscrivez des joueurs et assignez-leur un scénario commun.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <Card title="Créer une compétition">
        <form onSubmit={handleCreateMatch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Nom de la compétition" value={newMatchName} onChange={(event) => setNewMatchName(event.target.value)} placeholder="Ex : Saison 1 - Automne 2026" />
          </div>
          <Button type="submit" disabled={isRunning || !newMatchName.trim()}>Créer la compétition</Button>
        </form>
      </Card>

      <section aria-labelledby="competition-matches" className="flex flex-col gap-3">
        <h2 id="competition-matches" className="text-base font-semibold text-slate-900">Compétitions</h2>
        {competitionState.matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Aucune compétition pour le moment : créez-en une ci-dessus.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {competitionState.matches.map((match) => (
              <Card key={match.id} title={match.name}>
                <p className="text-sm text-slate-500">
                  {competitionState.players.filter((player) => player.matchId === match.id).length} joueur(s)
                </p>
                <Link to={`/competition/${match.id}`} className="mt-3 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                  Ouvrir le match →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

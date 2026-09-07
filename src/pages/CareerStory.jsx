import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useCareerContext } from "../context/CareerContext";
import { findEventDefinition } from "../lib/career/careerEvents";

function formatConsequence(consequence) {
  if (!consequence) return "";
  const parts = [];
  if (consequence.reputationDelta) parts.push(`Réputation ${consequence.reputationDelta > 0 ? "+" : ""}${consequence.reputationDelta}`);
  if (consequence.cashDelta) parts.push(`Trésorerie ${consequence.cashDelta > 0 ? "+" : ""}${consequence.cashDelta} €`);
  if (consequence.skillId) parts.push(`+${consequence.skillPoints} points de ${consequence.skillId}`);
  return parts.join(" · ");
}

export default function CareerStory() {
  const { careerState, isRunning, error, triggerStoryEvent } = useCareerContext();

  if (!careerState) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Démarrez d'abord votre carrière depuis le tableau de bord.</div>;
  }

  const currentEvent = careerState.storyline.currentEventId ? findEventDefinition(careerState.storyline.currentEventId) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Storyline</h1>
          <p className="mt-1 text-sm text-slate-500">Vos choix ont un impact réel sur l'hôtel et votre réputation.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <section aria-labelledby="story-current" className="flex flex-col gap-3">
        <h2 id="story-current" className="text-base font-semibold text-slate-900">Événement en cours</h2>
        {!currentEvent ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Aucun événement narratif pour le moment.</div>
        ) : (
          <Card title={currentEvent.title}>
            <p className="text-sm text-slate-700">{currentEvent.text}</p>
            <div className="mt-4 flex flex-col gap-2">
              {currentEvent.choices.map((choice) => (
                <Button
                  key={choice.id}
                  variant="secondary"
                  onClick={() => triggerStoryEvent(currentEvent.id, choice.id).catch(() => undefined)}
                  disabled={isRunning}
                >
                  {choice.label}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="story-history" className="flex flex-col gap-3">
        <h2 id="story-history" className="text-base font-semibold text-slate-900">Historique et conséquences</h2>
        <Card>
          {careerState.storyline.history.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun choix pris pour le moment.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {careerState.storyline.history.map((entry) => (
                <li key={`${entry.eventId}-${entry.day}`} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">Jour {entry.day} · {entry.title}</p>
                  <p className="text-slate-600">Choix : {entry.choiceLabel}</p>
                  <p className="text-slate-500">Impact sur l'hôtel : {formatConsequence(entry.consequence) || "aucun"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

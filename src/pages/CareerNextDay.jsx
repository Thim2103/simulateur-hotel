import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import { useCareerContext } from "../context/CareerContext";

export default function CareerNextDay() {
  const { careerState, isRunning, error, nextDay } = useCareerContext();
  const [lastOutcome, setLastOutcome] = useState(null);

  if (!careerState) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Démarrez d'abord votre carrière depuis le tableau de bord.</div>;
  }

  const handleNextDay = async () => {
    try {
      const outcome = await nextDay();
      setLastOutcome(outcome);
    } catch {
      // error surfaced via `error`.
    }
  };

  const report = lastOutcome?.report;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jour suivant</h1>
          <p className="mt-1 text-sm text-slate-500">Jour actuel : {careerState.day}</p>
        </div>
        <Button onClick={handleNextDay} disabled={isRunning}>{isRunning ? "Calcul en cours…" : "Jour suivant"}</Button>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!report ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cliquez sur « Jour suivant » pour avancer d'une journée et voir le résumé.
        </div>
      ) : (
        <>
          <section aria-labelledby="day-summary" className="flex flex-col gap-3">
            <h2 id="day-summary" className="text-base font-semibold text-slate-900">Résumé de la journée</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Profit ajusté" value={`${report.adjustedProfit} €`} />
              <KpiCard label="Score du jour" value={report.dayScore} />
              <KpiCard label="Réputation" value={report.progression.reputation ?? "—"} />
            </div>
          </section>

          <section aria-labelledby="day-consequences" className="flex flex-col gap-3">
            <h2 id="day-consequences" className="text-base font-semibold text-slate-900">Conséquences</h2>
            <Card>
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Missions terminées : {report.completedMissions.length === 0 ? "aucune" : report.completedMissions.map((m) => m.title).join(", ")}</li>
                <li>Objectifs atteints aujourd'hui : {report.achievedObjectives.length === 0 ? "aucun" : report.achievedObjectives.map((o) => o.label).join(", ")}</li>
                <li>Événements du jour : {report.dailyReport.events.length === 0 ? "aucun" : report.dailyReport.events.map((event) => event.message || event.name).join(", ")}</li>
                {report.newStoryEvent && <li>Nouvel événement narratif disponible : {report.newStoryEvent.title}</li>}
              </ul>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

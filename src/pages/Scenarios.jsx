import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import Badge from "../components/ui/Badge";
import { createGuestHotelBundle } from "../lib/guest";
import { createScenarioTemplate } from "../lib/scenario/scenarioSchema";
import { initScenarioRun, playScenarioCycle, finalizeScenarioRun } from "../lib/scenario/scenarioEngine";

// A short, always-available scenario -- reach a positive profit within 5
// days. Not persisted anywhere (see Scenarios.jsx's own docstring): a
// scenario picker/author UI is a documented future extension (see
// lib/scenario/scenarioSchema.js's header), not built here -- this page
// exists so /scenarios has one real, playable scenario today instead of
// an empty placeholder.
function discoveryScenario() {
  return createScenarioTemplate("solo", {
    title: "Scénario découverte",
    description: "Terminez la semaine avec un profit cumulé positif.",
    duration: { unit: "days", value: 5 },
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0, label: "Profit cumulé positif", required: true }],
  });
}

// Route: /scenarios -- plays a Scenario end to end through the real
// Scenario Engine (lib/scenario/scenarioEngine.js): initScenarioRun() ->
// playScenarioCycle() once per day, sandboxed (persist: false, same as
// Career/Academy/Competition) -> finalizeScenarioRun() once every cycle
// has run.
export default function Scenarios() {
  const [scenario] = useState(discoveryScenario);
  const [runState, setRunState] = useState(null);
  const [lastCycleReport, setLastCycleReport] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const start = () => {
    const bundle = createGuestHotelBundle();
    setRunState(initScenarioRun({ scenario, ...bundle }));
    setLastCycleReport(null);
    setFinalReport(null);
    setError(null);
  };

  const playNextCycle = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const { report, runState: nextRunState } = await playScenarioCycle({ runState });
      setRunState(nextRunState);
      setLastCycleReport(report);
      if (nextRunState.status === "finished") {
        setFinalReport(finalizeScenarioRun(nextRunState));
      }
    } catch (runError) {
      setError(runError);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scénarios</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{scenario.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{scenario.description}</p>
        </div>
        {!runState ? (
          <Button onClick={start}>Démarrer le scénario</Button>
        ) : (
          runState.status === "running" && (
            <Button onClick={playNextCycle} disabled={isRunning}>{isRunning ? "Calcul en cours…" : "Jour suivant"}</Button>
          )
        )}
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {runState && (
        <p className="text-sm text-slate-500">
          Jour {runState.cycleIndex} / {runState.totalCycles} · Statut : {runState.status}
        </p>
      )}

      {lastCycleReport && !lastCycleReport.blocked && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Profit du jour" value={`${lastCycleReport.baseReport.profit} €`} />
          <KpiCard label="Score du jour" value={lastCycleReport.score} />
          <KpiCard label="Objectifs atteints" value={lastCycleReport.objectivesStatus.objectives.filter((o) => o.achieved).length} />
        </div>
      )}

      {finalReport && (
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">Résultat final</h2>
            <Badge type={finalReport.passed ? "success" : "danger"}>{finalReport.grade} · {finalReport.gradeLabel}</Badge>
          </div>
          <p className="text-sm text-slate-700">Score final : {finalReport.finalScore}/100</p>
          {finalReport.recommendations.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-slate-600">
              {finalReport.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

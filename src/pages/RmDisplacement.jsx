import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

// Route: /rm-advanced/displacement -- revenue lost to a suboptimal
// segment mix on high-compression dates. Built on the same
// useRmAdvancedEngine.js as RmAdvancedDashboard.jsx.
export default function RmDisplacement() {
  const { careerState, isRunning: isCareerRunning } = useCareerContext();
  const { rmAdvancedState, isRunning: isRmRunning, error, loadRmAdvancedState, applyRmAdvancedAction } = useRmAdvancedEngine();

  useEffect(() => {
    loadRmAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isRmRunning;

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue Management avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Displacement</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le displacement.</p>
          </div>
        </header>
        <Card><Link to="/rm-advanced"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const displacement = rmAdvancedState?.displacement || { bySegment: {}, totalLoss: null, worstDates: [] };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Displacement</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenu perdu par un mauvais mix segment -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/rm-advanced"><Button variant="outline">← Dashboard RM avancé</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du displacement…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard label="Perte totale estimée" value={displacement.totalLoss !== null ? `${displacement.totalLoss} €` : "—"} trend={displacement.totalLoss > 0 ? -1 : undefined} />
            <KpiCard label="Dates impactées" value={`${displacement.worstDates.length}`} />
          </div>

          {Object.keys(displacement.bySegment).length > 0 && (
            <BarChart
              title="Perte par segment (€)"
              labels={Object.keys(displacement.bySegment)}
              data={Object.values(displacement.bySegment)}
            />
          )}

          <Card title="Dates les plus impactées">
            {displacement.worstDates.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun displacement détecté.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {displacement.worstDates.map((entry) => (
                  <li key={entry.date} className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-2">
                    <span>{entry.date}</span>
                    <span className="font-medium">{entry.loss} €</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section aria-labelledby="displacement-actions" className="flex flex-col gap-3">
            <h2 id="displacement-actions" className="text-base font-semibold text-slate-900">Action displacement</h2>
            <Card>
              <Button variant="outline" onClick={() => applyRmAdvancedAction("optimiser-mix-segments")} disabled={isRunning}>
                Optimiser le mix segments
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                Rééquilibre l'allocation des chambres vers les segments à plus forte valeur sur les dates en tension.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

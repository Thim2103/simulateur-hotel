import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

// Route: /rm-advanced/pickup -- the J-30 -> J-0 booking-pace curve and
// momentum analysis. Built on the same useRmAdvancedEngine.js as
// RmAdvancedDashboard.jsx.
export default function RmPickup() {
  const { careerState, isRunning: isCareerRunning } = useCareerContext();
  const { rmAdvancedState, isRunning: isRmRunning, error, loadRmAdvancedState } = useRmAdvancedEngine();

  useEffect(() => {
    loadRmAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue Management avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pick-up</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le pick-up.</p>
          </div>
        </header>
        <Card><Link to="/rm-advanced"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const pickupCurves = rmAdvancedState?.pickupCurves || { curve: [], momentum: null };
  const isRunning = isCareerRunning || isRmRunning;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pick-up</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rythme de réservation J-30 → J-0 -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/rm-advanced"><Button variant="outline">← Dashboard RM avancé</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du pick-up…</p></Card>
      ) : !pickupCurves.curve.length ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer la courbe de pick-up.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard label="Réservé à J-0" value={`${pickupCurves.curve[pickupCurves.curve.length - 1]?.bookedPct ?? 0}%`} />
            <KpiCard
              label="Momentum (J-21 → J-7)"
              value={pickupCurves.momentum !== null ? `${pickupCurves.momentum > 0 ? "+" : ""}${pickupCurves.momentum} pts` : "—"}
              trend={pickupCurves.momentum < -15 ? -1 : undefined}
            />
          </div>

          <LineChart
            title="Courbe de pick-up cumulée"
            labels={pickupCurves.curve.map((entry) => `J-${entry.leadTimeDays}`)}
            data={pickupCurves.curve.map((entry) => entry.bookedPct)}
          />

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4">Lead time</th>
                    <th className="pb-2">% déjà réservé</th>
                  </tr>
                </thead>
                <tbody>
                  {pickupCurves.curve.map((entry) => (
                    <tr key={entry.leadTimeDays} className="border-t border-slate-100">
                      <td className="py-1.5 pr-4 text-slate-600">J-{entry.leadTimeDays}</td>
                      <td className="py-1.5 font-medium text-slate-900">{entry.bookedPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import { createGuestHotelBundle } from "../lib/guest";
import { runDailyCycle } from "../lib/dailyCycle/runDailyCycle";

// Route: /sandbox -- free play, no missions/objectives/scoring, nothing
// persisted (not even in Guest Mode's localStorage). Seeded from the same
// createGuestHotelBundle() Guest Mode uses (see lib/guest/guestAdapter.js)
// so there's a ready-to-play hotel immediately, then every "Jouer un
// jour" click runs the real runDailyCycle() with persist:false -- the
// same sandboxed engine call Career/Academy/Competition/Scenario all
// share, just with no layer of missions/scoring/replay recording on top.
export default function Sandbox() {
  const [bundle, setBundle] = useState(() => createGuestHotelBundle());
  const [day, setDay] = useState(0);
  const [lastReport, setLastReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const playDay = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const referenceDate = new Date();
      referenceDate.setDate(referenceDate.getDate() + day);
      const report = await runDailyCycle({ ...bundle, referenceDate, persist: false });
      setBundle(report.nextState);
      setLastReport(report);
      setDay((value) => value + 1);
    } catch (runError) {
      setError(runError);
    } finally {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setBundle(createGuestHotelBundle());
    setDay(0);
    setLastReport(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sandbox</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jeu libre</h1>
          <p className="mt-1 text-sm text-slate-500">Jour {day} · Aucun objectif, aucune sauvegarde -- explorez librement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} disabled={isRunning}>Recommencer</Button>
          <Button onClick={playDay} disabled={isRunning}>{isRunning ? "Calcul en cours…" : "Jouer un jour"}</Button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!lastReport ? (
        <Card>
          <p className="text-sm text-slate-500">Cliquez sur « Jouer un jour » pour lancer la simulation.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Profit du jour" value={`${lastReport.profit} €`} />
          <KpiCard label="Chambres occupées" value={lastReport.hotelRevenue.occupiedRooms} />
          <KpiCard label="Revenu restaurant" value={`${lastReport.restaurantRevenue.netRevenue} €`} />
        </div>
      )}
    </div>
  );
}

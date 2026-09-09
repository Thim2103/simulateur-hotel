import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

// Route: /rm-advanced/compression -- occupancy compression by date, with
// surbooking-risk (high) and under-occupancy (low) alerts. Built on the
// same useRmAdvancedEngine.js as RmAdvancedDashboard.jsx.
export default function RmCompression() {
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compression</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir la compression.</p>
          </div>
        </header>
        <Card><Link to="/rm-advanced"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const compression = rmAdvancedState?.compression || { byDate: [], avgCompression: null, highCompressionDates: [], lowOccupancyDates: [] };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compression</h1>
          <p className="mt-1 text-sm text-slate-500">
            Taux d'occupation par date -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/rm-advanced"><Button variant="outline">← Dashboard RM avancé</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement de la compression…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Compression moyenne" value={compression.avgCompression !== null ? `${compression.avgCompression}%` : "—"} />
            <KpiCard label="Dates à risque de surbooking" value={`${compression.highCompressionDates.length}`} trend={compression.highCompressionDates.length > 0 ? -1 : undefined} />
            <KpiCard label="Dates sous-occupées" value={`${compression.lowOccupancyDates.length}`} trend={compression.lowOccupancyDates.length > 3 ? -1 : undefined} />
          </div>

          {compression.byDate.length > 0 && (
            <BarChart
              title="Occupation par date"
              labels={compression.byDate.map((entry) => entry.date.slice(5))}
              data={compression.byDate.map((entry) => entry.occupancyRate)}
            />
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Dates à forte compression">
              {compression.highCompressionDates.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune date en tension.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {compression.highCompressionDates.map((date) => (
                    <li key={date} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <span>{date}</span>
                      <Badge type="warning">Risque surbooking</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Dates sous-occupées">
              {compression.lowOccupancyDates.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune date sous-occupée.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {compression.lowOccupancyDates.map((date) => (
                    <li key={date} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <span>{date}</span>
                      <Badge type="info">À stimuler</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <section aria-labelledby="compression-actions" className="flex flex-col gap-3">
            <h2 id="compression-actions" className="text-base font-semibold text-slate-900">Action compression</h2>
            <Card>
              <Button variant="outline" onClick={() => applyRmAdvancedAction("augmenter-adr")} disabled={isRunning}>
                Augmenter l'ADR
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                Relève le tarif moyen sur les dates en forte compression pour capturer davantage de valeur.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

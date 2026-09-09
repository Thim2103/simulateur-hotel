import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { dominantSegment } from "../lib/clients/clientsSegments";

const SEGMENT_LABELS = {
  business: "Business",
  leisure: "Loisirs",
  famille: "Famille",
  premium: "Premium",
};

// Route: /clients/segments -- detailed breakdown of the four guest
// segments (Business / Leisure / Famille / Premium), their shares,
// evolution and performance, plus segment-specific actions. Built on
// the same clientsEngine.js/useClientsEngine.js pair as
// ClientsDashboard.jsx.
export default function ClientsSegments() {
  const { careerState, isRunning: isCareerRunning } = useCareerContext();
  const { clientsState, isRunning: isClientsRunning, error, loadClientsState, applyClientsAction } = useClientsEngine();

  useEffect(() => {
    loadClientsState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isClientsRunning;

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Relation client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Segments clients</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos segments clients.</p>
          </div>
        </header>
        <Card><Link to="/clients"><Button>← Retour au tableau de bord</Button></Link></Card>
      </div>
    );
  }

  const segments = clientsState?.segments || {};
  const replayEntries = clientsState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((e) => `Cycle ${e.cycleIndex + 1}`);
  const dominant = clientsState ? dominantSegment(segments) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Segments clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Répartition et évolution des segments -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/clients"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!clientsState ? (
        <Card><p className="text-sm text-slate-500">Chargement des segments…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.entries(segments).map(([key, value]) => (
              <KpiCard
                key={key}
                label={SEGMENT_LABELS[key] || key}
                value={`${value}%`}
                trend={key === dominant ? undefined : undefined}
              />
            ))}
          </div>

          {dominant && (
            <Card>
              <p className="text-sm text-slate-700">
                Segment dominant : <span className="font-semibold">{SEGMENT_LABELS[dominant] || dominant}</span> ({segments[dominant]}%).
                {segments[dominant] > 65 && (
                  <span className="ml-1 text-amber-600">Concentration élevée — diversifier la mix recommandée.</span>
                )}
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart
              title="Répartition des segments (cycle actuel)"
              labels={Object.keys(segments).map((k) => SEGMENT_LABELS[k] || k)}
              data={Object.values(segments)}
            />
            <LineChart
              title="Satisfaction par cycle"
              labels={trendLabels}
              data={replayEntries.map((e) => e.satisfaction ?? 0)}
            />
          </div>

          <section aria-labelledby="segments-actions" className="flex flex-col gap-3">
            <h2 id="segments-actions" className="text-base font-semibold text-slate-900">Action segments</h2>
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => applyClientsAction("optimiser-mix-segments")} disabled={isRunning}>
                  Optimiser le mix segments
                </Button>
                <Button variant="outline" onClick={() => applyClientsAction("campagne-reputation")} disabled={isRunning}>
                  Campagne réputation
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                L'optimisation du mix rééquilibre la répartition vers une clientèle plus diversifiée. La campagne réputation
                booste l'attractivité des segments premium et loisirs.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

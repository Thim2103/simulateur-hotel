import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import AreaChart from "../components/charts/AreaChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

const TREND_BADGE = { improving: "success", stable: "info", declining: "danger" };
const TREND_LABEL = { improving: "En hausse", stable: "Stable", declining: "En baisse" };

// Route: /clients/reviews -- avis clients (notes, tendances, split
// positif/négatif, plaintes). Built on useClientsEngine.js, same
// pattern as ClientsDashboard.jsx.
export default function ClientsReviews() {
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Avis clients</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos avis clients.</p>
          </div>
        </header>
        <Card><Link to="/clients"><Button>← Retour au tableau de bord</Button></Link></Card>
      </div>
    );
  }

  const reviews = clientsState?.reviews || {};
  const complaints = clientsState?.complaints || [];
  const replayEntries = clientsState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((e) => `Cycle ${e.cycleIndex + 1}`);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Avis clients</h1>
          <p className="mt-1 text-sm text-slate-500">Notes, tendances et plaintes -- jour {careerState.day}.</p>
        </div>
        <Link to="/clients"><Button variant="outline">← Tableau de bord</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!clientsState ? (
        <Card><p className="text-sm text-slate-500">Chargement des avis…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Note moyenne" value={reviews.avgRating ? `${reviews.avgRating.toFixed(1)}/5` : "—"} trend={reviews.trend === "declining" ? -1 : undefined} />
            <KpiCard label="Nombre d'avis" value={`${reviews.count ?? 0}`} />
            <KpiCard label="Avis positifs" value={`${reviews.positive ?? 0}%`} trend={reviews.positive >= 70 ? undefined : -1} />
            <KpiCard label="Avis négatifs" value={`${reviews.negative ?? 0}%`} trend={reviews.negative > 20 ? -1 : undefined} />
          </div>

          {reviews.trend && (
            <Card>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">Tendance des avis :</span>
                <Badge type={TREND_BADGE[reviews.trend] || "info"}>{TREND_LABEL[reviews.trend] || reviews.trend}</Badge>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart
              title="Note clients (par cycle)"
              labels={trendLabels}
              data={replayEntries.map((e) => Math.round((e.avgRating ?? 0) * 20))}
            />
            <AreaChart
              title="Positifs vs. Négatifs (satisfaction proxy)"
              labels={trendLabels}
              data={replayEntries.map((e) => e.satisfaction ?? 0)}
            />
          </div>

          <section aria-labelledby="clients-complaints" className="flex flex-col gap-3">
            <h2 id="clients-complaints" className="text-base font-semibold text-slate-900">Plaintes en cours</h2>
            <Card>
              {complaints.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune plainte en cours.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {complaints.map((complaint, index) => (
                    <li key={index} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                      <div>
                        <span className="font-medium text-slate-900 capitalize">{complaint.type}</span>
                        <span className="ml-2 text-slate-500">— {complaint.resolved ? "résolue" : "en attente"}</span>
                      </div>
                      <Badge type={complaint.severity === "high" ? "danger" : "warning"}>{complaint.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="reviews-actions" className="flex flex-col gap-3">
            <h2 id="reviews-actions" className="text-base font-semibold text-slate-900">Actions sur les avis</h2>
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => applyClientsAction("resoudre-plaintes")} disabled={isRunning}>
                  Résoudre les plaintes
                </Button>
                <Button variant="outline" onClick={() => applyClientsAction("campagne-reputation")} disabled={isRunning}>
                  Campagne réputation
                </Button>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

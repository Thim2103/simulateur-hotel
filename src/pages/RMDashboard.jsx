import { useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import PickupChart from "../components/charts/PickupChart";
import SegmentationChart from "../components/charts/SegmentationChart";
import { useRM } from "../hooks/useRM";

const PRIORITY_BADGE_TYPE = { high: "danger", medium: "warning", low: "info" };

function AdjustmentPill({ label, value }) {
  const percent = Math.round((value || 0) * 100);
  const tone = percent > 0 ? "text-emerald-600" : percent < 0 ? "text-rose-600" : "text-slate-500";
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{percent > 0 ? "+" : ""}{percent}%</p>
    </div>
  );
}

// Advanced revenue management view: forecast, pick-up, dynamic pricing,
// segmentation, and recommendations, all produced by lib/rm/rmEngine.js
// (the same engine runDailyCycle() runs once a day -- this page lets you
// preview it on demand for the current PMS state).
export default function RMDashboard() {
  const { runRM, rmReport, isRunning, error } = useRM();

  useEffect(() => {
    runRM().catch(() => undefined); // surfaced via `error` below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions & pricing</h1>
          <p className="mt-1 text-sm text-slate-500">Prévisions de revenus, rythme de réservation, tarification dynamique et recommandations RM.</p>
        </div>
        <Button onClick={() => runRM().catch(() => undefined)} disabled={isRunning}>
          {isRunning ? "Analyse en cours…" : "Relancer l'analyse"}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Impossible de calculer le rapport RM : {error.message}
        </div>
      )}

      {!rmReport && !error && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {isRunning ? "Calcul du rapport RM en cours…" : "Aucun rapport RM disponible pour le moment."}
        </div>
      )}

      {rmReport && (
        <>
          <section aria-labelledby="rm-forecast" className="flex flex-col gap-3">
            <h2 id="rm-forecast" className="text-base font-semibold text-slate-900">Prévisions de revenus</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Prévision 7 jours" value={`${rmReport.forecast.next7.toLocaleString()} €`} />
              <KpiCard label="Prévision 30 jours" value={`${rmReport.forecast.next30.toLocaleString()} €`} />
              <KpiCard label="Prévision 90 jours" value={`${rmReport.forecast.next90.toLocaleString()} €`} />
            </div>
            {rmReport.forecast.daily30?.length > 0 && (
              <LineChart
                title="Prévision de revenu (30 prochains jours)"
                labels={rmReport.forecast.daily30.map((point) => point.date.slice(5))}
                data={rmReport.forecast.daily30.map((point) => point.value)}
              />
            )}
          </section>

          <section aria-labelledby="rm-pricing" className="flex flex-col gap-3">
            <h2 id="rm-pricing" className="text-base font-semibold text-slate-900">Tarification dynamique</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="ADR recommandé" value={`${rmReport.pricing.recommendedADR} €`} />
              <KpiCard label="Tarif plancher" value={`${rmReport.pricing.minPrice} €`} />
              <KpiCard label="Tarif plafond" value={`${rmReport.pricing.maxPrice} €`} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AdjustmentPill label="Ajustement occupation" value={rmReport.pricing.occupancyAdjustment} />
              <AdjustmentPill label="Ajustement météo" value={rmReport.pricing.weatherAdjustment} />
              <AdjustmentPill label="Ajustement événements" value={rmReport.pricing.eventAdjustment} />
            </div>
          </section>

          <section aria-labelledby="rm-pickup" className="flex flex-col gap-3">
            <h2 id="rm-pickup" className="text-base font-semibold text-slate-900">Rythme de réservation</h2>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <PickupChart pickup={rmReport.pickup.daily} />
              <SegmentationChart segmentation={rmReport.segmentation.mix} />
            </div>
          </section>

          <section aria-labelledby="rm-segmentation" className="flex flex-col gap-3">
            <h2 id="rm-segmentation" className="text-base font-semibold text-slate-900">ADR par segment</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(rmReport.segmentation.adrBySegment).map(([segment, value]) => (
                <div key={segment} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{segment}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{value} €</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="rm-recommendations" className="flex flex-col gap-3">
            <h2 id="rm-recommendations" className="text-base font-semibold text-slate-900">Recommandations RM</h2>
            <Card>
              <ul className="space-y-2">
                {rmReport.recommendations.map((recommendation) => (
                  <li key={recommendation.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="text-sm text-slate-700">{recommendation.message}</span>
                    <Badge type={PRIORITY_BADGE_TYPE[recommendation.priority] || "info"}>{recommendation.priority}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

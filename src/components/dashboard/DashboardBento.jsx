import { Link } from "react-router-dom";
import { BentoCard, MetricDonut, SoftButton, Sparkline, StatusBadge } from "../../ui/bento";
import SeasonEventsBanner from "./SeasonEventsBanner";
import { occupancyOf } from "../../lib/dashboard/statusSummary";
import { safeArray, safeNumber } from "../../lib/safe";

const euro = (value) => `${Math.round(safeNumber(value, 0)).toLocaleString("fr-FR")} €`;
const CHAIN_LINES = 4;
const REVENUE_DAYS = 14;

// Quick access to the three things a manager does most: change the prices,
// launch a campaign (both open the yield & marketing desk) and answer the
// guests' reviews (a page of its own, with the count of the bad ones waiting).
export function QuickActions({ onOpenGrowth, reviewsToAnswer = 0, onOpenLoyalty }) {
  return (
    <section aria-label="Accès rapide" data-testid="quick-actions" className="flex flex-wrap items-center gap-2">
      <SoftButton tone="success" icon="📈" data-testid="quick-yield" onClick={onOpenGrowth}>
        Ajuster tarifs (Yield)
      </SoftButton>
      <SoftButton tone="mice" icon="📣" data-testid="quick-campaign" onClick={onOpenGrowth}>
        Lancer campagne
      </SoftButton>
      <SoftButton as={Link} to="/clients/reviews" tone="vip" icon="⭐" data-testid="quick-reviews">
        Répondre aux avis
        {reviewsToAnswer > 0 && <StatusBadge tone="danger" data-testid="quick-reviews-count">{reviewsToAnswer}</StatusBadge>}
      </SoftButton>
      {onOpenLoyalty && (
        <SoftButton tone="vip" icon="🎖️" data-testid="quick-loyalty" onClick={onOpenLoyalty}>
          Club & Fidélité
        </SoftButton>
      )}
    </section>
  );
}

// Card 1: the day played, in four figures, and the chain of causes behind it.
export function TodaySummaryCard({ review }) {
  return (
    <BentoCard title="Résumé de la journée" icon="🧭" tone="action" span={2} data-testid="bento-summary">
      {!review ? (
        <p className="text-sm text-slate-500">Pas encore de résultats : ils apparaîtront après votre première journée.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Recette", euro(review.summary.revenue)],
              ["Résultat", euro(review.summary.profit)],
              ["Satisfaction", review.summary.satisfaction === null || review.summary.satisfaction === undefined ? "—" : `${Number(review.summary.satisfaction).toFixed(1)}/5`],
              ["Moral équipe", review.summary.staffMorale === null || review.summary.staffMorale === undefined ? "—" : `${review.summary.staffMorale}/100`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          {review.causalChain.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pourquoi ce résultat</h3>
              <ol data-testid="bento-causal-chain" className="flex flex-col gap-2">
                {review.causalChain.slice(0, CHAIN_LINES).map((line, index) => (
                  <li key={index} className="flex gap-2 text-sm text-slate-700">
                    <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">{index + 1}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Link to="/daily-review" className="self-start text-sm font-semibold text-blue-700 hover:underline">Voir le rapport complet →</Link>
        </div>
      )}
    </BentoCard>
  );
}

// Card 2: the season, the events in progress or coming, and the weather --
// which, in the game, is a climate event (heat or cold wave) or nothing.
export function SeasonCard({ calendar }) {
  const climate = safeArray(calendar?.ongoing).find((event) => event.kind === "climate");
  return (
    <BentoCard title="Saison & événements" icon={calendar?.season?.icon || "🗓️"} tone="success" data-testid="bento-season">
      <div className="flex flex-col gap-3">
        <p data-testid="bento-weather" className="flex items-center gap-2 text-sm text-slate-700">
          <span aria-hidden="true" className="text-lg">{climate ? climate.icon : "⛅"}</span>
          Météo : <strong>{climate ? climate.name : "conditions normales"}</strong>
        </p>
        <SeasonEventsBanner calendar={calendar} />
      </div>
    </BentoCard>
  );
}

// Card 3: how full the hotel is, what it took, and the last days' revenue.
export function OccupancyRevenueCard({ rooms, kpis, hotelState }) {
  const occupancy = occupancyOf(rooms);
  const revenue = safeArray(hotelState?.finance?.revenue).slice(-REVENUE_DAYS);
  return (
    <BentoCard title="Occupation & revenus" icon="📈" tone="success" span={2} data-testid="bento-occupancy">
      <div className="flex flex-wrap items-center gap-6">
        <MetricDonut value={occupancy.rate} label="Occupation" caption="occupées" tone={occupancy.rate >= 80 ? "success" : "action"} />
        <div className="flex min-w-40 flex-1 flex-col gap-3">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{occupancy.occupied}</strong> chambre{occupancy.occupied > 1 ? "s" : ""} sur {occupancy.total} ce soir
            {kpis && <> · recette du dernier jour <strong className="text-slate-900">{euro(kpis.revenueToday)}</strong></>}
          </p>
          {revenue.length >= 2 ? (
            <div>
              <Sparkline values={revenue} label={`Revenus des ${revenue.length} derniers jours`} tone="success" />
              <p className="text-xs text-slate-500">Revenus des {revenue.length} derniers jours</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">La courbe des revenus apparaîtra après quelques journées.</p>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

// Card 4: what needs the manager now -- breakdowns, V.I.P.s to welcome, bad
// reviews, seminar quotes, GM Desk messages (lib/dashboard/statusSummary.js).
export function UrgentAlertsCard({ items }) {
  return (
    <BentoCard title="Alertes urgentes" icon="🚨" tone={items.length > 0 ? "vip" : "success"} data-testid="bento-alerts">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Rien d'urgent pour l'instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={item.to} data-testid={`alert-${item.id}`} data-priority={item.priority ? "true" : undefined} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.priority ? "border-rose-300 bg-rose-50 font-semibold" : "border-slate-200"}`}>
                <StatusBadge tone={item.tone} icon={item.icon}>{item.count}</StatusBadge>
                <span className="text-sm text-slate-800">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}

// The Bento grid itself: summary + season on top, occupancy + alerts below.
export default function DashboardBento({ review, calendar, rooms, kpis, hotelState, alerts }) {
  return (
    <div data-testid="dashboard-bento" className="bento-grid">
      <TodaySummaryCard review={review} />
      <SeasonCard calendar={calendar} />
      <OccupancyRevenueCard rooms={rooms} kpis={kpis} hotelState={hotelState} />
      <UrgentAlertsCard items={alerts} />
    </div>
  );
}

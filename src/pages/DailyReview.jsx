import { useEffect } from "react";
import { Link } from "react-router-dom";
import GameButton from "../ui/components/GameButton";
import GameCard from "../ui/components/GameCard";
import GameSection from "../ui/components/GameSection";
import { useDailyReview } from "../hooks/useDailyReview";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";
import { messageTypeMeta } from "../ui/gmDesk/GmMessageTypes";
import { fadeIn, slideUp, delay } from "../ui/animations";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const MAINTENANCE_LEVEL_LABELS = { economy: "Économique", standard: "Standard", premium: "Premium" };
const MAINTENANCE_CATEGORY_LABELS = { rooms: "Chambres", equipment: "Équipements", floors: "Étages" };

const STAFF_EVENT_STYLES = {
  resigned: { icon: "🚪", className: "border-rose-200 bg-rose-50 text-rose-900" },
  "resignation-notice": { icon: "⚠️", className: "border-rose-200 bg-rose-50 text-rose-900" },
  sick: { icon: "🤒", className: "border-amber-200 bg-amber-50 text-amber-900" },
  "raise-request": { icon: "💶", className: "border-amber-200 bg-amber-50 text-amber-900" },
  "resignation-withdrawn": { icon: "🙂", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  "express-training": { icon: "🎓", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
};

const DEMAND_FACTOR_LABELS = { reputation: "Réputation", price: "Prix", season: "Saison", events: "Événements", incidents: "Pannes", marketing: "Marketing" };

const YIELD_RULE_LABELS = { occupancy: "occupation élevée", lastMinute: "dernière minute", events: "événements & haute saison" };

function StatTile({ label, icon, value, tone = "default", index = 0 }) {
  return (
    <GameCard className={slideUp}>
      <div style={delay(index)} className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">{icon}</span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`mt-1 text-lg font-semibold ${tone === "danger" ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
    </GameCard>
  );
}

// A small, dependency-free "stylised graph": a horizontal bar whose fill
// width reflects revenue vs. profit, so the summary reads visually rather
// than as bare numbers alone -- no chart library needed for two bars.
function RevenueProfitBar({ revenue, profit }) {
  const max = Math.max(Math.abs(revenue), Math.abs(profit), 1);
  const revenueWidth = Math.round((Math.abs(revenue) / max) * 100);
  const profitWidth = Math.round((Math.abs(profit) / max) * 100);
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-16 shrink-0">Revenu</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0b1730] transition-all duration-500" style={{ width: `${revenueWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-16 shrink-0">Profit</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${profit >= 0 ? "bg-[#e9ab1f]" : "bg-rose-500"}`} style={{ width: `${profitWidth}%` }} />
        </div>
      </div>
    </div>
  );
}

// "DailyReview" -- the last step of the daily loop (Morning -> MyHotel ->
// Decisions -> Day -> Results), reached from Dashboard.jsx's "Jouer la
// journée" button. Route: /daily-review. See hooks/useDailyReview.js/
// lib/dashboard/dailyReview.js. Restyled with the game design system --
// every heading/label/link text is unchanged from before.
export default function DailyReview() {
  const { review, isRunning, error, loadReview } = useDailyReview();
  const { messages: gmMessages } = useGmDesk();

  useEffect(() => {
    loadReview().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!review) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Résultats</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Aucune journée jouée pour l'instant</h1>
            <p className="mt-1 text-sm text-slate-500">Jouez une journée depuis votre hôtel pour voir ce qui s'est passé.</p>
          </div>
        </header>
        <Link to="/dashboard">
          <GameButton icon="🏨">Aller à l'hôtel</GameButton>
        </Link>
      </div>
    );
  }

  const { summary } = review;

  return (
    <div className="flex flex-col gap-6">
      <header className={`page-header ${slideUp}`}>
        <div>
          <p className="eyebrow">🌙 Résultats</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Que s'est-il passé ? — Jour {review.day}</h1>
          {review.date && <p className="mt-1 text-sm text-slate-500">{review.date}</p>}
        </div>
        <Link to="/dashboard">
          <GameButton disabled={isRunning}>Retour à l'hôtel</GameButton>
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <GameSection id="review-summary" title="Résumé" icon="📊" className={fadeIn}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Revenu" icon="💵" value={`${summary.revenue.toLocaleString()} €`} index={0} />
          <StatTile label="Profit" icon="💰" tone={summary.profit >= 0 ? "default" : "danger"} value={`${summary.profit.toLocaleString()} €`} index={1} />
          <StatTile label="Satisfaction" icon="⭐" value={summary.satisfaction === null ? "—" : `${summary.satisfaction.toFixed(1)}/5`} index={2} />
          <StatTile label="Moral du personnel" icon="👔" value={summary.staffMorale === null || summary.staffMorale === undefined ? "—" : `${summary.staffMorale}/100`} index={3} />
        </div>
        <RevenueProfitBar revenue={summary.revenue} profit={summary.profit} />
      </GameSection>

      {review.guestReviews && (
        <GameSection id="review-guest-reviews" title="Avis clients" icon="💬">
          <GameCard>
            {review.guestReviews.posted.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {review.guestReviews.posted.map((guestReview) => (
                  <li
                    key={guestReview.id}
                    data-testid="review-posted"
                    data-vip={guestReview.profile === "vip" ? "true" : "false"}
                    className={`rounded-lg border p-2 ${guestReview.profile === "vip" ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
                  >
                    <span className="font-semibold text-amber-600" aria-label={`Note ${guestReview.rating} sur 5`}>
                      {"★".repeat(guestReview.rating)}
                      {"☆".repeat(5 - guestReview.rating)}
                    </span>{" "}
                    <span className="text-xs text-slate-600">
                      {guestReview.guestName}
                      {guestReview.profile === "vip" ? " · ⭐ V.I.P. (poids ×3)" : ""}
                    </span>
                    <p className="text-slate-700">« {guestReview.text} »</p>
                    {guestReview.praise && (
                      <p data-testid="review-praise" className="mt-1 text-xs font-semibold text-emerald-800">
                        🌟 Avis élogieux : boost de réputation et article à la une.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Aucun nouvel avis aujourd'hui.</p>
            )}
            {review.guestReviews.toAnswer > 0 && (
              <p data-testid="reviews-to-answer" className="mt-2 text-sm text-rose-800">
                {review.guestReviews.toAnswer} avis négatif(s) en attente de réponse.{" "}
                <Link to="/clients/reviews" className="font-semibold underline">
                  Répondre →
                </Link>
              </p>
            )}
          </GameCard>
        </GameSection>
      )}

      {review.mice && (
        <GameSection id="review-mice" title="Séminaires & événements pro" icon="🤝">
          <GameCard>
            <ul className="flex flex-col gap-2 text-sm">
              {review.mice.newRequests.map((request) => (
                <li key={`new-${request.id}`} data-testid="mice-new" className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-900">
                  📨 Nouvelle demande : <strong>{request.company}</strong> — {request.attendees} personnes, {request.days} jour{request.days > 1 ? "s" : ""}, à partir du {request.startDate}.
                </li>
              ))}
              {review.mice.today.map((event) => (
                <li key={`today-${event.id}`} data-testid="mice-today" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
                  🤝 <strong>{event.company}</strong> aujourd'hui — salle {event.meetingRoomNumber}, {event.attendees} personnes, {event.cateringPerDay.toLocaleString("fr-FR")} € de restauration.
                </li>
              ))}
              {review.mice.startingSoon.map((event) => (
                <li key={`soon-${event.id}`} data-testid="mice-soon" className="rounded-lg border border-dashed border-slate-300 p-2 text-slate-800">
                  ⏳ <strong>{event.company}</strong> démarre le {event.startDate} — {event.attendees} personnes.
                </li>
              ))}
              {review.mice.completed.map((event) => (
                <li key={`done-${event.id}`} data-testid="mice-completed" className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800">
                  ✅ <strong>{event.company}</strong> terminé — {event.quote.total.toLocaleString("fr-FR")} € de chiffre d'affaires.
                </li>
              ))}
            </ul>
            {review.mice.pending > 0 && (
              <p data-testid="mice-pending" className="mt-2 text-sm text-slate-700">
                {review.mice.pending} devis en attente.{" "}
                <Link to="/corporate/events" className="font-semibold underline">
                  Les traiter →
                </Link>
              </p>
            )}
          </GameCard>
        </GameSection>
      )}

      {review.growth && (
        <GameSection id="review-growth" title="Yield & marketing" icon="🎯">
          <GameCard>
            {review.growth.yield && (
              <div data-testid="growth-yield" className="text-sm text-slate-800">
                <p className="font-semibold">Yield management actif</p>
                <p className="text-xs text-slate-600">
                  {review.growth.yield.adjusted > 0
                    ? `${review.growth.yield.adjusted} réservation(s) ajustée(s) (${review.growth.yield.raised} hausse(s), ${review.growth.yield.lowered} baisse(s)) : ${review.growth.yield.revenueDelta >= 0 ? "+" : "−"}${Math.abs(review.growth.yield.revenueDelta).toLocaleString("fr-FR")} € de revenu attendu.`
                    : "Aucune réservation à ajuster aujourd'hui : les prix sont restés au niveau habituel."}
                </p>
                {Object.keys(review.growth.yield.byRule || {}).length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                    {Object.entries(review.growth.yield.byRule).map(([rule, count]) => (
                      <li key={rule} data-testid="growth-yield-rule" className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                        {YIELD_RULE_LABELS[rule] || rule} ×{count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {(review.growth.campaigns.length > 0 || review.growth.running.length > 0) && (
              <div data-testid="growth-campaigns" className={review.growth.yield ? "mt-3" : ""}>
                <p className="text-sm font-semibold text-slate-800">
                  Campagnes marketing — demande ×{review.growth.marketingFactor.toFixed(2)} aujourd'hui
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-700">
                  {review.growth.running.map((campaign) => (
                    <li key={campaign.id} data-testid="growth-campaign-running" data-type={campaign.typeId}>
                      {campaign.icon} {campaign.name} — {campaign.daysLeft} jour(s) restant(s) · {campaign.extraBookings.toLocaleString("fr-FR")} réservation(s) supplémentaire(s) · {campaign.extraRevenue.toLocaleString("fr-FR")} € générés
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.growth.ended.map((campaign) => (
              <p key={campaign.id} data-testid="growth-campaign-ended" data-type={campaign.typeId} className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                {campaign.icon} {campaign.name} terminée — {campaign.extraBookings.toLocaleString("fr-FR")} réservation(s) supplémentaire(s), {campaign.extraRevenue.toLocaleString("fr-FR")} € pour {campaign.cost.toLocaleString("fr-FR")} € investis : ROI {campaign.roi >= 0 ? "+" : "−"}
                {Math.abs(Math.round(campaign.roi * 100))} %
              </p>
            ))}
          </GameCard>
        </GameSection>
      )}

      {review.calendar && (
        <GameSection id="review-calendar" title="Saison & événements" icon="📅">
          <GameCard>
            <p data-testid="calendar-season" data-tier={review.calendar.season.tier} className="text-sm font-semibold text-slate-800">
              {review.calendar.season.icon} {review.calendar.season.label}
              {review.calendar.season.demandPercent !== 0 ? ` · demande ${review.calendar.season.demandPercent > 0 ? "+" : "−"}${Math.abs(review.calendar.season.demandPercent)} %` : ""}
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {review.calendar.ongoing.map((event) => (
                <li key={`ongoing-${event.id}`} data-testid="calendar-ongoing" data-event={event.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
                  <span aria-hidden="true">{event.icon}</span> <strong>{event.name}</strong> — {event.endsToday ? "dernier jour" : `jour ${event.dayNumber}/${event.totalDays}`}
                  {event.endsToday && event.kind !== "audit" ? " : l'événement se termine aujourd'hui." : ""}
                  <span className="block text-xs">{event.effects.join(" · ")}</span>
                </li>
              ))}
              {review.calendar.upcoming.map((event) => (
                <li key={`upcoming-${event.id}`} data-testid="calendar-upcoming" data-event={event.id} className="rounded-lg border border-dashed border-slate-300 p-2 text-slate-800">
                  <span aria-hidden="true">{event.icon}</span> <strong>{event.name}</strong> — dans {event.startsInDays} jour{event.startsInDays > 1 ? "s" : ""} ({event.totalDays} j)
                  <span className="block text-xs">{event.effects.join(" · ")}</span>
                </li>
              ))}
              {review.calendar.audit && (
                <li data-testid="calendar-audit" data-outcome={review.calendar.audit.outcome} className={`rounded-lg border p-2 ${review.calendar.audit.outcome === "label" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : review.calendar.audit.outcome === "warning" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                  🧾 {review.calendar.audit.message}
                </li>
              )}
            </ul>
            {review.calendar.ongoing.length === 0 && review.calendar.upcoming.length === 0 && !review.calendar.audit && (
              <p className="mt-2 text-xs text-slate-500">Aucun événement en cours ni annoncé.</p>
            )}
          </GameCard>
        </GameSection>
      )}

      {review.maintenance && (
        <GameSection id="review-maintenance" title="Entretien & charges d'exploitation" icon="🔧">
          <GameCard>
            <p data-testid="maintenance-total" className="text-sm font-semibold text-slate-800">
              {review.maintenance.total.toLocaleString("fr-FR")} € aujourd'hui · niveau {MAINTENANCE_LEVEL_LABELS[review.maintenance.level] || review.maintenance.level}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {Object.entries(MAINTENANCE_CATEGORY_LABELS)
                .filter(([key]) => review.maintenance[key] > 0)
                .map(([key, label]) => (
                  <li key={key} data-testid={`maintenance-line-${key}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                    {label} {review.maintenance[key].toLocaleString("fr-FR")} €
                  </li>
                ))}
            </ul>
            <p data-testid="maintenance-condition" className={`mt-2 text-xs ${review.maintenance.condition < 60 ? "text-rose-700" : "text-slate-500"}`}>
              État de l'hôtel : {review.maintenance.condition}/100
            </p>
          </GameCard>
        </GameSection>
      )}

      {review.demand && (
        <GameSection id="review-demand" title="Demande" icon="📈">
          <GameCard>
            <p
              data-testid="demand-headline"
              data-tone={review.demand.tone}
              className={`text-sm font-semibold ${review.demand.tone === "strong" ? "text-emerald-700" : review.demand.tone === "weak" ? "text-rose-700" : "text-slate-700"}`}
            >
              {review.demand.headline}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {review.demand.newBookings} nouvelle(s) réservation(s)
              {review.demand.turnedAway > 0 ? ` · ${review.demand.turnedAway} demande(s) refusée(s) faute de chambre libre` : ""}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {review.demand.drivers.map((driver) => (
                <li key={driver.key} data-testid="demand-driver" className={`rounded-full border px-2 py-0.5 ${driver.factor >= 1 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                  {DEMAND_FACTOR_LABELS[driver.key] || driver.key} ×{driver.factor.toFixed(2)}
                </li>
              ))}
            </ul>
          </GameCard>
        </GameSection>
      )}

      <GameSection id="review-why" title="Pourquoi ?" icon="🧭">
        <GameCard>
          {review.causalChain.length === 0 ? (
            <p className="text-sm text-slate-500">Rien de notable à expliquer aujourd'hui.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-slate-700">
              {review.causalChain.map((line, index) => (
                <li key={index} style={delay(index)} className={`flex items-start gap-2 ${slideUp}`}>
                  <span aria-hidden="true" className="mt-0.5 text-[#e9ab1f]">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </GameCard>
      </GameSection>

      {review.staffEvents?.length > 0 && (
        <GameSection id="review-staff-events" title="Ressources humaines" icon="👥">
          <GameCard>
            <ul className="flex flex-col gap-2 text-sm">
              {review.staffEvents.map((staffEvent) => (
                <li
                  key={staffEvent.id}
                  data-testid="staff-event"
                  data-type={staffEvent.type}
                  className={`flex items-start gap-2 rounded-lg border p-2 ${STAFF_EVENT_STYLES[staffEvent.type]?.className || "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  <span aria-hidden="true">{STAFF_EVENT_STYLES[staffEvent.type]?.icon || "👤"}</span>
                  <span>{staffEvent.message}</span>
                </li>
              ))}
            </ul>
            <Link to="/staff" className="mt-3 inline-block text-xs font-semibold text-cyan-700 hover:underline">
              Gérer l'équipe →
            </Link>
          </GameCard>
        </GameSection>
      )}

      {review.incidentReviews?.length > 0 && (
        <GameSection id="review-incident-reviews" title="Avis clients liés aux pannes" icon="💬">
          <GameCard>
            <ul className="flex flex-col gap-2">
              {review.incidentReviews.map((incidentReview) => (
                <li key={incidentReview.id} data-testid="incident-review" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-900">
                  <span className="shrink-0 font-semibold" aria-label={`Note ${incidentReview.rating} sur 5`}>
                    {"★".repeat(incidentReview.rating)}
                    {"☆".repeat(5 - incidentReview.rating)}
                  </span>
                  <span>« {incidentReview.text} »</span>
                </li>
              ))}
            </ul>
            <Link to="/dashboard" className="mt-3 inline-block text-xs font-semibold text-cyan-700 hover:underline">
              Réparer depuis le plan de l'hôtel →
            </Link>
          </GameCard>
        </GameSection>
      )}

      <GameSection id="review-messages" title="Messages reçus aujourd'hui" icon="📬">
        <GameCard>
          {gmMessages.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun message au GM Desk pour l'instant.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {gmMessages
                  .slice()
                  .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3))
                  .slice(0, 5)
                  .map((message) => (
                    <li key={message.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                      <span aria-hidden="true">{messageTypeMeta(message.type).icon}</span>
                      <span className="flex-1 truncate">{message.title}</span>
                    </li>
                  ))}
              </ul>
              <Link to="/gm-desk" className="mt-3 inline-block text-xs font-semibold text-cyan-700 hover:underline">
                Voir tous les messages au GM Desk →
              </Link>
            </>
          )}
        </GameCard>
      </GameSection>

      {review.attentionItems.length > 0 && (
        <GameSection id="review-more" title="En savoir plus" icon="🔎">
          <GameCard>
            <ul className="flex flex-col gap-2">
              {review.attentionItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2 text-sm">
                  <span>{item.message}</span>
                  <Link to={item.moduleLink} className="shrink-0 text-xs font-semibold text-cyan-700 hover:underline">
                    {item.moduleLabel} →
                  </Link>
                </li>
              ))}
            </ul>
          </GameCard>
        </GameSection>
      )}
    </div>
  );
}

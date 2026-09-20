import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import AreaChart from "../components/charts/AreaChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { buildIncidentReviewHistory } from "../lib/maintenance/incidentImpact";
import { ZONE_STYLES } from "../ui/hotelView/schematic/schematicTokens";
import ReviewResponseModal, { points } from "../components/clients/ReviewResponseModal";
import { listReviews, respondToReview, currentImpact, pressHighlights, RESPONSE_TYPES } from "../lib/clients/guestReviewEngine";
import { PROFILES } from "../lib/clients/guestProfiles";

const TREND_BADGE = { improving: "success", stable: "info", declining: "danger" };
const TREND_LABEL = { improving: "En hausse", stable: "Stable", declining: "En baisse" };

// Where the reviewed incident stands NOW (a review outlives its incident).
const INCIDENT_STATUS_BADGE = {
  active: { type: "danger", label: "Panne en cours" },
  repairing: { type: "warning", label: "Réparation en cours" },
  resolved: { type: "success", label: "Réparée" },
};

// Guest reviews of departed stays (see lib/clients/guestReviewEngine.js).
const STAY_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "todo", label: "À traiter", matches: (review) => review.impact < 0 && !review.response },
  { id: "vip", label: "V.I.P.", matches: (review) => review.profile === "vip" },
  { id: "answered", label: "Répondus", matches: (review) => !!review.response },
];

const REVIEW_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "open", label: "Pannes en cours", matches: (review) => review.incidentStatus === "active" || review.incidentStatus === "repairing" },
  { id: "resolved", label: "Pannes réparées", matches: (review) => review.incidentStatus === "resolved" },
];

// Route: /clients/reviews -- avis clients (notes, tendances, split
// positif/négatif, plaintes). Built on useClientsEngine.js, same
// pattern as ClientsDashboard.jsx.
export default function ClientsReviews() {
  const [reviewFilter, setReviewFilter] = useState("all");
  const [stayFilter, setStayFilter] = useState("all");
  // The review being answered (see ReviewResponseModal.jsx).
  const [respondingId, setRespondingId] = useState(null);
  const { careerState, isRunning: isCareerRunning, applyHotelAdjustment } = useCareerContext();
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

  // Individual reviews caused by equipment incidents (see lib/maintenance/
  // incidentImpact.js) -- the only per-review records this app keeps; the
  // KPIs above are aggregates.
  const incidentReviews = buildIncidentReviewHistory(careerState.hotel?.hotelState);
  const activeFilter = REVIEW_FILTERS.find((filter) => filter.id === reviewFilter) || REVIEW_FILTERS[0];
  const visibleIncidentReviews = activeFilter.matches ? incidentReviews.filter(activeFilter.matches) : incidentReviews;

  // Every review the player can answer, breakdown reviews included.
  const answerable = listReviews(careerState.hotel?.hotelState);
  const answerableById = Object.fromEntries(answerable.map((review) => [review.id, review]));
  const stayReviews = answerable.filter((review) => review.source === "stay");
  const activeStayFilter = STAY_FILTERS.find((filter) => filter.id === stayFilter) || STAY_FILTERS[0];
  const visibleStayReviews = activeStayFilter.matches ? stayReviews.filter(activeStayFilter.matches) : stayReviews;
  const respondingReview = respondingId ? answerableById[respondingId] || null : null;
  const frontPage = pressHighlights(careerState.hotel?.hotelState);

  const handleRespond = (type) => {
    if (!respondingId) return;
    Promise.resolve(applyHotelAdjustment?.((hotel) => respondToReview(hotel, respondingId, type, { day: careerState.day })))
      .catch(() => undefined)
      .finally(() => setRespondingId(null));
  };

  // The button and answer badge of a review card.
  const renderAnswer = (review) => {
    if (!review) return null;
    const answered = review.response ? RESPONSE_TYPES[review.response.type] : null;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {answered ? (
          <Badge type="info">Répondu : {answered.label.toLowerCase()}</Badge>
        ) : (
          <button
            type="button"
            data-testid={`respond-${review.id}`}
            onClick={() => setRespondingId(review.id)}
            className="rounded-lg border border-cyan-700 px-3 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50"
          >
            {review.impact < 0 ? "Répondre / Offrir un geste commercial" : "Répondre"}
          </button>
        )}
        <span className="text-xs text-slate-500">Impact réputation : {points(currentImpact(review))}</span>
      </div>
    );
  };

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

          {frontPage.length > 0 && (
            <section aria-labelledby="reviews-press" className="flex flex-col gap-3">
              <h2 id="reviews-press" className="text-base font-semibold text-slate-900">
                À la une <span className="text-sm font-normal text-slate-500">({frontPage.length})</span>
              </h2>
              <Card>
                <ul className="flex flex-col gap-2">
                  {frontPage.map((article) => (
                    <li key={article.id} data-testid="press-highlight" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                      <p className="font-semibold text-amber-950">🌟 {article.headline}</p>
                      <p className="text-slate-700">« {article.text} »</p>
                      <p className="text-xs text-slate-500">Jour {article.day}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <section aria-labelledby="reviews-stays" className="flex flex-col gap-3">
            <h2 id="reviews-stays" className="text-base font-semibold text-slate-900">
              Avis des séjours <span className="text-sm font-normal text-slate-500">({stayReviews.length})</span>
            </h2>
            <Card>
              {stayReviews.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun avis de séjour pour l'instant : ils arrivent quand des clients quittent l'hôtel.</p>
              ) : (
                <>
                  <div role="group" aria-label="Filtrer les avis de séjour" className="mb-3 flex flex-wrap gap-2">
                    {STAY_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        aria-pressed={stayFilter === filter.id}
                        onClick={() => setStayFilter(filter.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${stayFilter === filter.id ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  {visibleStayReviews.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun avis dans cette catégorie.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {visibleStayReviews.map((review) => {
                        const profile = PROFILES[review.profile];
                        return (
                          <li key={review.id} data-testid="stay-review" data-profile={review.profile} data-vip={review.profile === "vip" ? "true" : "false"} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-amber-600" aria-label={`Note ${review.rating} sur 5`}>
                                {"★".repeat(review.rating)}
                                {"☆".repeat(5 - review.rating)}
                              </span>
                              {profile && (
                                <Badge type={review.profile === "vip" ? "warning" : "info"}>
                                  {profile.icon} {profile.label}
                                </Badge>
                              )}
                              {review.weight > 1 && <Badge type="warning">Poids ×{review.weight}</Badge>}
                              <span className="text-xs text-slate-500">
                                {review.guestName} · chambre {review.roomNumber} · Jour {review.day}
                              </span>
                            </div>
                            <p className="text-slate-700">« {review.text} »</p>
                            {renderAnswer(review)}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </Card>
          </section>

          <section aria-labelledby="reviews-incidents" className="flex flex-col gap-3">
            <h2 id="reviews-incidents" className="text-base font-semibold text-slate-900">
              Avis liés aux pannes <span className="text-sm font-normal text-slate-500">({incidentReviews.length})</span>
            </h2>
            <Card>
              {incidentReviews.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun avis lié à une panne pour l'instant.</p>
              ) : (
                <>
                  <div role="group" aria-label="Filtrer les avis" className="mb-3 flex flex-wrap gap-2">
                    {REVIEW_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        aria-pressed={reviewFilter === filter.id}
                        onClick={() => setReviewFilter(filter.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${reviewFilter === filter.id ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  {visibleIncidentReviews.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun avis dans cette catégorie.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {visibleIncidentReviews.map((review) => {
                        const status = INCIDENT_STATUS_BADGE[review.incidentStatus];
                        return (
                          <li key={review.id} data-testid="incident-review" className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-amber-600" aria-label={`Note ${review.rating} sur 5`}>
                                {"★".repeat(review.rating)}
                                {"☆".repeat(5 - review.rating)}
                              </span>
                              <Badge type="warning">Problème technique</Badge>
                              {status && <Badge type={status.type}>{status.label}</Badge>}
                              <span className="text-xs text-slate-500">
                                {(ZONE_STYLES[review.zone] || ZONE_STYLES.default).label} · Jour {review.day}
                              </span>
                            </div>
                            <p className="text-slate-700">« {review.text} »</p>
                            {renderAnswer(answerableById[review.id])}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </Card>
          </section>

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

          {respondingReview && (
            <ReviewResponseModal hotelState={careerState.hotel?.hotelState} review={respondingReview} onRespond={handleRespond} onClose={() => setRespondingId(null)} />
          )}
        </>
      )}
    </div>
  );
}

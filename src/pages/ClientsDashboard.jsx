import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import AreaChart from "../components/charts/AreaChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { CLIENTS_ACTION_CATALOG } from "../lib/clients/clientsEngine";
import { loyaltyGrade } from "../lib/clients/clientsLoyalty";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = {
  satisfaction: "Satisfaction",
  loyalty: "Fidélité",
  segments: "Segments",
  reputation: "Réputation",
};
const CLIENTS_KEYWORDS = /client|segment|satisf|fidél|avis|plainte|revue|guest/i;

// The refonte of the old Clients.jsx (a static prompt/CRUD table): a
// real client experience dashboard -- segments, satisfaction, avis,
// fidélité, plaintes, comportements, diagnostics et actions -- built
// on lib/clients/clientsEngine.js and hooks/useClientsEngine.js, the
// same pattern pages/HousekeepingDashboard.jsx/EsgDashboard.jsx already
// established. Works identically for a real Supabase session and Guest
// Mode.
export default function ClientsDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { clientsState, isRunning: isClientsRunning, error: clientsError, loadClientsState, applyClientsAction } = useClientsEngine();

  useEffect(() => {
    loadClientsState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isClientsRunning;
  const error = clientsError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyClientsAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isClientsRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données clients…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Relation client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clients</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs clients.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadClientsState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = clientsState?.diagnostics || [];
  const replayEntries = clientsState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((entry) => `Cycle ${entry.cycleIndex + 1}`);
  const forecastDays = clientsState?.forecast?.scenarios?.realiste?.days || [];
  const segments = clientsState?.segments || {};

  const clientsMissions = (careerState.missions || []).filter((m) =>
    CLIENTS_KEYWORDS.test(`${m.id} ${m.title} ${m.description || ""}`)
  );
  const clientsObjectives = (careerState.objectives || []).filter((o) =>
    CLIENTS_KEYWORDS.test(`${o.id} ${o.label || ""}`)
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Satisfaction, fidélité, avis et segments -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/clients/segments"><Button variant="outline">Segments</Button></Link>
          <Link to="/clients/reviews"><Button variant="outline">Avis</Button></Link>
          <Link to="/clients/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/clients/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!clientsState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle clients…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Satisfaction globale"
              value={`${clientsState.satisfaction}/100`}
              trend={clientsState.satisfaction >= 60 ? undefined : -1}
            />
            <KpiCard
              label="Fidélité"
              value={`${clientsState.loyalty}/100`}
              trend={clientsState.loyalty >= 50 ? undefined : -1}
            />
            <KpiCard
              label="Note clients"
              value={clientsState.reviews?.avgRating ? `${clientsState.reviews.avgRating.toFixed(1)}/5` : "—"}
              trend={clientsState.reviews?.trend === "declining" ? -1 : undefined}
            />
            <KpiCard
              label="Avis positifs"
              value={clientsState.reviews?.positive ? `${clientsState.reviews.positive}%` : "—"}
            />
            <KpiCard
              label="Plaintes"
              value={`${clientsState.complaints?.length ?? 0}`}
              trend={clientsState.complaints?.length > 0 ? -1 : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Segment Business" value={`${segments.business ?? 0}%`} />
            <KpiCard label="Segment Loisirs" value={`${segments.leisure ?? 0}%`} />
            <KpiCard label="Segment Famille" value={`${segments.famille ?? 0}%`} />
            <KpiCard label="Segment Premium" value={`${segments.premium ?? 0}%`} />
          </div>

          {clientsState.behaviors?.returnRate !== null && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Taux de retour" value={`${clientsState.behaviors.returnRate}%`} trend={clientsState.behaviors.returnRate >= 40 ? undefined : -1} />
              <KpiCard label="Dépense moyenne" value={clientsState.behaviors.avgSpend !== null ? `${clientsState.behaviors.avgSpend} €` : "—"} />
              <KpiCard label="Profil de fidélité" value={loyaltyGrade(clientsState.loyalty)} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="Satisfaction (par cycle)" labels={trendLabels} data={replayEntries.map((e) => e.satisfaction ?? 0)} />
            <LineChart title="Fidélité (par cycle)" labels={trendLabels} data={replayEntries.map((e) => e.loyalty ?? 0)} />
            <BarChart title="Note clients (par cycle)" labels={trendLabels} data={replayEntries.map((e) => Math.round((e.avgRating ?? 0) * 20))} />
            <AreaChart title="Prévision satisfaction (30 jours)" labels={forecastDays.map((d) => `J${d.day}`)} data={forecastDays.map((d) => d.satisfaction)} />
          </div>

          <section aria-labelledby="clients-diagnostics" className="flex flex-col gap-3">
            <h2 id="clients-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics Clients</h2>
            <Card>
              {diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diagnostics.map((diag, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diag.message}</span>
                      <Badge type={SEVERITY_BADGE[diag.severity] || "info"}>{diag.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {(clientsMissions.length > 0 || clientsObjectives.length > 0) && (
            <section aria-labelledby="clients-career" className="flex flex-col gap-3">
              <h2 id="clients-career" className="text-base font-semibold text-slate-900">Progression Clients (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions Clients">
                  {clientsMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission clients pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {clientsMissions.map((m) => (
                        <li key={m.id} className="rounded-lg border border-slate-200 p-2">
                          {m.title} <span className="text-slate-500">({m.status})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs Clients">
                  {clientsObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif clients pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {clientsObjectives.map((o) => (
                        <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                          <span>{o.label}</span>
                          <Badge type={o.achieved ? "success" : "info"}>{o.achieved ? "atteint" : "en cours"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
              {careerState.rewardsInbox?.length > 0 && (
                <Card>
                  <p className="text-sm text-slate-700">
                    {careerState.rewardsInbox.length} récompense(s) à réclamer.{" "}
                    <Link to="/career/rewards" className="font-semibold text-cyan-700">Voir →</Link>
                  </p>
                </Card>
              )}
            </section>
          )}

          <section aria-labelledby="clients-actions" className="flex flex-col gap-3">
            <h2 id="clients-actions" className="text-base font-semibold text-slate-900">Actions Clients</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CLIENTS_ACTION_CATALOG.map((action) => (
                  <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction(action.id)} disabled={isRunning}>
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

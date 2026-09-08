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
import { useHousekeepingEngine } from "../hooks/useHousekeepingEngine";
import { HOUSEKEEPING_ACTION_CATALOG } from "../lib/housekeeping/housekeepingEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { planning: "Planning", overload: "Surcharge", staffing: "Effectif", quality: "Qualité", efficiency: "Efficacité" };
const HK_KEYWORDS = /housekeeping|nettoy|chambre|propret|qualit.*chambre/i;

// The refonte of the old Housekeeping.jsx (a static, disconnected task
// table): a real housekeeping dashboard -- charge, productivité, temps
// de nettoyage, surcharge, sous-effectif, qualité, diagnostics et
// actions -- built on lib/housekeeping/housekeepingEngine.js and
// hooks/useHousekeepingEngine.js, the same pattern pages/
// FinanceDashboard.jsx/StaffDashboard.jsx/MarketingDashboard.jsx/
// EsgDashboard.jsx already established. Works identically for a real
// Supabase session and a Guest Mode session.
export default function HousekeepingDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { housekeepingState, isRunning: isHkRunning, error: hkError, loadHousekeepingState, applyHousekeepingAction } = useHousekeepingEngine();

  useEffect(() => {
    loadHousekeepingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isHkRunning;
  const error = hkError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyHousekeepingAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isHkRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données housekeeping…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Entretien des chambres</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Housekeeping</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs housekeeping.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              // Passes startCareer()'s own returned state explicitly:
              // reading careerState off context here would still be the
              // pre-startCareer() value (null) until the next render --
              // see hooks/useFinance.js's applyFinancialDecision()
              // docstring for the same race and fix applied there.
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadHousekeepingState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = housekeepingState?.diagnostics || [];
  const replayEntries = housekeepingState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((entry) => `Cycle ${entry.cycleIndex + 1}`);
  const forecastDays = housekeepingState?.forecast?.scenarios?.realiste?.days || [];
  const priorities = housekeepingState?.workload?.priorities || {};

  const hkMissions = (careerState.missions || []).filter((mission) => HK_KEYWORDS.test(`${mission.id} ${mission.title} ${mission.description || ""}`));
  const hkObjectives = (careerState.objectives || []).filter((objective) => HK_KEYWORDS.test(`${objective.id} ${objective.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Entretien des chambres</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Housekeeping</h1>
          <p className="mt-1 text-sm text-slate-500">Charge, productivité, qualité et diagnostics -- jour {careerState.day}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/housekeeping/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/housekeeping/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!housekeepingState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle housekeeping…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Charge (chambres)" value={`${housekeepingState.workload.roomsToClean}`} />
            <KpiCard label="Productivité" value={`${housekeepingState.productivity}/100`} />
            <KpiCard label="Temps de nettoyage" value={`${housekeepingState.cleaningTime.minutesPerRoom} min/chambre`} />
            <KpiCard label="Surcharge" value={`${housekeepingState.overload}%`} trend={housekeepingState.overload <= 100 ? undefined : -1} />
            <KpiCard label="Sous-effectif" value={housekeepingState.understaffing.understaffed ? `-${housekeepingState.understaffing.shortfall}` : "Non"} trend={housekeepingState.understaffing.understaffed ? -1 : undefined} />
            <KpiCard label="Qualité" value={`${housekeepingState.quality}/100`} trend={housekeepingState.quality >= 65 ? undefined : -1} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart title="Charge (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.roomsToClean ?? 0)} />
            <LineChart title="Productivité (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.productivity ?? 0)} />
            <AreaChart title="Surcharge (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.overload ?? 0)} />
            <LineChart title="Qualité (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.quality ?? 0)} />
            <LineChart title="Prévision de la qualité (30 prochains jours)" labels={forecastDays.map((entry) => `J${entry.day}`)} data={forecastDays.map((entry) => entry.quality)} />
          </div>

          <section aria-labelledby="hk-priorities" className="flex flex-col gap-3">
            <h2 id="hk-priorities" className="text-base font-semibold text-slate-900">Priorités du jour</h2>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Arrivées" value={`${priorities.arrivals ?? 0}`} />
              <KpiCard label="Départs" value={`${priorities.departures ?? 0}`} />
              <KpiCard label="Stayovers" value={`${priorities.stayovers ?? 0}`} />
            </div>
          </section>

          <section aria-labelledby="hk-diagnostics" className="flex flex-col gap-3">
            <h2 id="hk-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics Housekeeping</h2>
            <Card>
              {diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diagnostics.map((diagnostic, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diagnostic.message}</span>
                      <Badge type={SEVERITY_BADGE[diagnostic.severity] || "info"}>{diagnostic.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {(hkMissions.length > 0 || hkObjectives.length > 0) && (
            <section aria-labelledby="hk-career" className="flex flex-col gap-3">
              <h2 id="hk-career" className="text-base font-semibold text-slate-900">Progression Housekeeping (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions Housekeeping">
                  {hkMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission housekeeping pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {hkMissions.map((mission) => (
                        <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title} <span className="text-slate-500">({mission.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs Housekeeping">
                  {hkObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif housekeeping pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {hkObjectives.map((objective) => (
                        <li key={objective.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                          <span>{objective.label}</span>
                          <Badge type={objective.achieved ? "success" : "info"}>{objective.achieved ? "atteint" : "en cours"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
              {careerState.rewardsInbox?.length > 0 && (
                <Card>
                  <p className="text-sm text-slate-700">
                    {careerState.rewardsInbox.length} récompense(s) à réclamer. <Link to="/career/rewards" className="font-semibold text-cyan-700">Voir →</Link>
                  </p>
                </Card>
              )}
            </section>
          )}

          <section aria-labelledby="hk-actions" className="flex flex-col gap-3">
            <h2 id="hk-actions" className="text-base font-semibold text-slate-900">Actions Housekeeping</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {HOUSEKEEPING_ACTION_CATALOG.map((action) => (
                  <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction(action.id)} disabled={isRunning}>Appliquer</Button>
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

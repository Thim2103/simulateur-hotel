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
import { useMarketingEngine } from "../hooks/useMarketingEngine";
import { MARKETING_ACTION_CATALOG } from "../lib/marketing/marketingEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { campaign: "Campagne", budget: "Budget", channel: "Canal", positioning: "Positionnement", reputation: "Réputation" };
const TIER_LABEL = { budget: "Budget", midscale: "Milieu de gamme", upscale: "Haut de gamme", luxury: "Luxe" };
const MARKETING_KEYWORDS = /marketing|campagne|réputation|reputation|canal|canaux|positionn/i;

// The refonte of the old Marketing.jsx (a raw hotelState.marketing
// editing form): a real marketing dashboard -- budget, ROI, conversion,
// réputation, segments, canaux, diagnostics and actions -- built on
// lib/marketing/marketingEngine.js and hooks/useMarketingEngine.js, the
// same pattern pages/FinanceDashboard.jsx/StaffDashboard.jsx already
// established. Works identically for a real Supabase session and a
// Guest Mode session.
export default function MarketingDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { marketingState, isRunning: isMarketingRunning, error: marketingError, loadMarketingState, applyMarketingAction } = useMarketingEngine();

  useEffect(() => {
    loadMarketingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isMarketingRunning;
  const error = marketingError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyMarketingAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isMarketingRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données marketing…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Acquisition &amp; fidélisation</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Marketing</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs marketing.</p>
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
              await loadMarketingState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = marketingState?.diagnostics || [];
  const replayEntries = marketingState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((entry) => `Cycle ${entry.cycleIndex + 1}`);
  const forecastDays = marketingState?.forecast?.scenarios?.realiste?.days || [];
  const segments = marketingState?.segments?.counts || {};

  const marketingMissions = (careerState.missions || []).filter((mission) => MARKETING_KEYWORDS.test(`${mission.id} ${mission.title} ${mission.description || ""}`));
  const marketingObjectives = (careerState.objectives || []).filter((objective) => MARKETING_KEYWORDS.test(`${objective.id} ${objective.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Acquisition &amp; fidélisation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">Budget, ROI, conversion et réputation -- jour {careerState.day}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/marketing/campaigns"><Button variant="outline">Campagnes</Button></Link>
          <Link to="/marketing/channels"><Button variant="outline">Canaux</Button></Link>
          <Link to="/marketing/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/marketing/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!marketingState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle marketing…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Budget marketing" value={`${marketingState.budget.total.toLocaleString()} €`} />
            <KpiCard label="ROI marketing" value={`${marketingState.roi.overallRoi}x`} trend={marketingState.roi.overallRoi >= 1 ? undefined : -1} />
            <KpiCard label="Conversion" value={`${marketingState.conversion.conversionRate}%`} />
            <KpiCard label="Réputation" value={`${marketingState.reputation}/100`} trend={marketingState.reputation >= 55 ? undefined : -1} />
            <KpiCard label="Positionnement" value={TIER_LABEL[marketingState.positioningTier] || marketingState.positioningTier} />
            <KpiCard label="Canaux actifs" value={`${marketingState.channels.filter((c) => c.enabled !== false).length}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="ROI marketing (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.roi?.overallRoi ?? 0)} />
            <BarChart title="Conversion (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.conversion?.conversionRate ?? 0)} />
            <AreaChart title="Réputation (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.reputation ?? 0)} />
            <LineChart title="Prévision ROI (30 prochains jours)" labels={forecastDays.map((entry) => `J${entry.day}`)} data={forecastDays.map((entry) => entry.roi)} />
          </div>

          <section aria-labelledby="marketing-segments" className="flex flex-col gap-3">
            <h2 id="marketing-segments" className="text-base font-semibold text-slate-900">Segments</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Business" value={`${segments.business ?? 0}`} />
              <KpiCard label="Leisure" value={`${segments.leisure ?? 0}`} />
              <KpiCard label="Famille" value={`${segments.famille ?? 0}`} />
              <KpiCard label="Premium" value={`${segments.premium ?? 0}`} />
            </div>
          </section>

          <section aria-labelledby="marketing-diagnostics" className="flex flex-col gap-3">
            <h2 id="marketing-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics marketing</h2>
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

          {(marketingMissions.length > 0 || marketingObjectives.length > 0) && (
            <section aria-labelledby="marketing-career" className="flex flex-col gap-3">
              <h2 id="marketing-career" className="text-base font-semibold text-slate-900">Progression marketing (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions marketing">
                  {marketingMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission marketing pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {marketingMissions.map((mission) => (
                        <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title} <span className="text-slate-500">({mission.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs marketing">
                  {marketingObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif marketing pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {marketingObjectives.map((objective) => (
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

          <section aria-labelledby="marketing-actions" className="flex flex-col gap-3">
            <h2 id="marketing-actions" className="text-base font-semibold text-slate-900">Actions marketing</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {MARKETING_ACTION_CATALOG.map((action) => (
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

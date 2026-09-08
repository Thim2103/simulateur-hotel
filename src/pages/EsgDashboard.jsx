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
import { useEsgEngine } from "../hooks/useEsgEngine";
import { ESG_ACTION_CATALOG } from "../lib/esg/esgEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { energy: "Énergie", water: "Eau", waste: "Déchets", co2: "CO₂", certification: "Certification", reputation: "Réputation" };
// \b word boundaries around "eau"/"co2": without them, "eau" matches
// inside unrelated words like "niveau" (level-3's own label/id) --
// found via live browser verification, where "Atteindre le niveau 3"
// wrongly showed up under "Objectifs ESG".
const ESG_KEYWORDS = /esg|durab|énergie|energie|\beau\b|déchet|dechet|\bco2\b|certifi|environ/i;

// The refonte of the old ESG.jsx (a raw percentage-slider editing form):
// a real ESG dashboard -- énergie, eau, déchets, CO₂, score, certifications,
// diagnostics and actions -- built on lib/esg/esgEngine.js and
// hooks/useEsgEngine.js, the same pattern pages/FinanceDashboard.jsx/
// StaffDashboard.jsx/MarketingDashboard.jsx already established. Works
// identically for a real Supabase session and a Guest Mode session.
export default function EsgDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { esgState, isRunning: isEsgRunning, error: esgError, loadEsgState, applyEsgAction } = useEsgEngine();

  useEffect(() => {
    loadEsgState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isEsgRunning;
  const error = esgError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyEsgAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isEsgRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données ESG…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Responsabilité environnementale</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ESG</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs ESG.</p>
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
              await loadEsgState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = esgState?.diagnostics || [];
  const certifications = esgState?.certifications || [];
  const replayEntries = esgState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((entry) => `Cycle ${entry.cycleIndex + 1}`);
  const forecastDays = esgState?.forecast?.scenarios?.realiste?.days || [];

  const esgMissions = (careerState.missions || []).filter((mission) => ESG_KEYWORDS.test(`${mission.id} ${mission.title} ${mission.description || ""}`));
  const esgObjectives = (careerState.objectives || []).filter((objective) => ESG_KEYWORDS.test(`${objective.id} ${objective.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Responsabilité environnementale</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ESG</h1>
          <p className="mt-1 text-sm text-slate-500">Énergie, eau, déchets, CO₂ et score ESG -- jour {careerState.day}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/esg/certifications"><Button variant="outline">Certifications</Button></Link>
          <Link to="/esg/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/esg/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!esgState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle ESG…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Énergie" value={`${esgState.energy.toLocaleString()} kWh`} />
            <KpiCard label="Eau" value={`${esgState.water.toLocaleString()} m³`} />
            <KpiCard label="Déchets" value={`${esgState.waste.toLocaleString()} kg`} />
            <KpiCard label="CO₂" value={`${esgState.co2.toLocaleString()} kg`} />
            <KpiCard label="Score ESG" value={`${esgState.score}/100`} trend={esgState.score >= 55 ? undefined : -1} />
            <KpiCard label="Certifications" value={`${certifications.filter((c) => c.obtained).length}/${certifications.length}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="Énergie (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.energy ?? 0)} />
            <BarChart title="Eau (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.water ?? 0)} />
            <AreaChart title="Déchets (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.waste ?? 0)} />
            <LineChart title="CO₂ (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.co2 ?? 0)} />
            <LineChart title="Prévision du score ESG (30 prochains jours)" labels={forecastDays.map((entry) => `J${entry.day}`)} data={forecastDays.map((entry) => entry.score)} />
          </div>

          <section aria-labelledby="esg-diagnostics" className="flex flex-col gap-3">
            <h2 id="esg-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics ESG</h2>
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

          {(esgMissions.length > 0 || esgObjectives.length > 0) && (
            <section aria-labelledby="esg-career" className="flex flex-col gap-3">
              <h2 id="esg-career" className="text-base font-semibold text-slate-900">Progression ESG (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions ESG">
                  {esgMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission ESG pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {esgMissions.map((mission) => (
                        <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title} <span className="text-slate-500">({mission.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs ESG">
                  {esgObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif ESG pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {esgObjectives.map((objective) => (
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

          <section aria-labelledby="esg-actions" className="flex flex-col gap-3">
            <h2 id="esg-actions" className="text-base font-semibold text-slate-900">Actions ESG</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ESG_ACTION_CATALOG.map((action) => (
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

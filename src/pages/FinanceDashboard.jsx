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
import { useFinance } from "../hooks/useFinance";
import { FINANCE_ACTION_CATALOG } from "../lib/finance/financeEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { marketing: "Marketing", staffing: "Staffing", pricing: "Tarifs", investment: "Investissement", costs: "Coûts" };

// The refonte of the old Finance.jsx: a real financial dashboard --
// compte de résultats, bilan, cash-flow, ratios (GOPPAR/RevPAR/payroll
// ratio), diagnostics and actions -- built on lib/finance/financeEngine.js
// and hooks/useFinance.js instead of the raw hotelState.finance editing
// form the old page was. Works identically for a real Supabase session
// and a Guest Mode session (see hooks/useSupabaseSession.js) since
// useFinance.js/financeRepository.js already bypass Supabase
// transparently in guest mode.
export default function FinanceDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { financeState, isRunning: isFinanceRunning, error: financeError, loadFinanceState, applyFinancialDecision } = useFinance();

  useEffect(() => {
    loadFinanceState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isFinanceRunning;
  const error = financeError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyFinancialDecision(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isFinanceRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données financières…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Performance financière</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Finance</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos états financiers.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              // Passes startCareer()'s own returned state explicitly:
              // reading careerState off context here would still be the
              // pre-startCareer() value (null) until the next render --
              // see hooks/useDashboard.js's loadDashboardState() docstring
              // for the same race and fix applied there.
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadFinanceState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const statement = financeState?.incomeStatement;
  const ratios = financeState?.ratios;
  const cashFlow = financeState?.cashFlow;
  const diagnostics = financeState?.diagnostics || [];
  const hotelFinance = careerState.hotel?.hotelState?.finance || {};
  const monthLabels = Array.isArray(hotelFinance.months) ? hotelFinance.months : Object.keys(hotelFinance.months || {});
  const forecastDays = financeState?.forecast?.scenarios?.realiste?.days || [];

  const FINANCE_KEYWORDS = /profit|financ|tarif|coût|budget|revenu|rentable/i;
  const financeMissions = (careerState.missions || []).filter((mission) => FINANCE_KEYWORDS.test(`${mission.id} ${mission.title} ${mission.description || ""}`));
  const financeObjectives = (careerState.objectives || []).filter((objective) => FINANCE_KEYWORDS.test(`${objective.id} ${objective.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Performance financière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">Compte de résultats, bilan, cash-flow et diagnostics -- jour {careerState.day}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/finance/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/finance/report"><Button variant="outline">Rapport complet</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!statement ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle financier…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Revenus" value={`${statement.revenues.total.toLocaleString()} €`} />
            <KpiCard label="Charges" value={`${statement.expenses.total.toLocaleString()} €`} />
            <KpiCard label="GOP" value={`${statement.gop.toLocaleString()} €`} trend={statement.gop >= 0 ? undefined : -1} />
            <KpiCard label="EBITDA" value={`${statement.ebitda.toLocaleString()} €`} trend={statement.ebitda >= 0 ? undefined : -1} />
            <KpiCard label="Cash-flow net" value={`${(cashFlow?.net ?? 0).toLocaleString()} €`} />
            <KpiCard label="GOPPAR" value={`${ratios?.goppar ?? 0} €`} />
            <KpiCard label="RevPAR" value={`${ratios?.revpar ?? 0} €`} />
            <KpiCard label="Payroll ratio" value={`${Math.round((ratios?.payrollRatio ?? 0) * 100)}%`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="Revenus mensuels (hôtel)" labels={monthLabels} data={hotelFinance.revenue || []} />
            <BarChart title="Charges mensuelles (hôtel)" labels={monthLabels} data={hotelFinance.costs || []} />
            <AreaChart
              title="Cash-flow (30 prochains jours, scénario réaliste)"
              labels={forecastDays.map((entry) => `J${entry.day}`)}
              data={forecastDays.map((entry) => entry.cash)}
            />
            <LineChart
              title="Prévision de revenu (30 prochains jours)"
              labels={forecastDays.map((entry) => `J${entry.day}`)}
              data={forecastDays.map((entry) => entry.revenue)}
            />
          </div>

          <section aria-labelledby="finance-diagnostics" className="flex flex-col gap-3">
            <h2 id="finance-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics financiers</h2>
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

          {(financeMissions.length > 0 || financeObjectives.length > 0) && (
            <section aria-labelledby="finance-career" className="flex flex-col gap-3">
              <h2 id="finance-career" className="text-base font-semibold text-slate-900">Progression financière (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions financières">
                  {financeMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission financière pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {financeMissions.map((mission) => (
                        <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title} <span className="text-slate-500">({mission.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs financiers">
                  {financeObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif financier pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {financeObjectives.map((objective) => (
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

          <section aria-labelledby="finance-actions" className="flex flex-col gap-3">
            <h2 id="finance-actions" className="text-base font-semibold text-slate-900">Actions financières</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FINANCE_ACTION_CATALOG.map((action) => (
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

import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import AreaChart from "../components/charts/AreaChart";
import HeatmapChart from "../components/charts/HeatmapChart";
import { useCareerContext } from "../context/CareerContext";
import { useStaffEngine } from "../hooks/useStaffEngine";
import { STAFF_ACTION_CATALOG } from "../lib/staff/staffEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { headcount: "Recrutement", training: "Formation", promotion: "Promotion", organization: "Organisation", overload: "Surcharge", wellbeing: "Bien-être" };
const HR_KEYWORDS = /staff|rh\b|personnel|équipe|moral|turnover|formation|recrut/i;

function sampleEvery(list, step) {
  return list.filter((_, index) => index % step === 0);
}

// The refonte of the old /staff page (see App.js -- the previous
// multi-site StaffDashboard.jsx moved to pages/ChainStaffDashboard.jsx at
// /chain/staff): a real HR dashboard -- moral, productivité, absentéisme,
// surcharge/sous-effectif, turnover, coûts RH, diagnostics and actions --
// built on lib/staff/staffEngine.js and hooks/useStaffEngine.js, the same
// pattern pages/FinanceDashboard.jsx already established. Works
// identically for a real Supabase session and a Guest Mode session.
export default function StaffDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { staffState, isRunning: isStaffRunning, error: staffError, loadStaffState, applyStaffAction } = useStaffEngine();

  useEffect(() => {
    loadStaffState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isStaffRunning;
  const error = staffError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyStaffAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isStaffRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données RH…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Ressources humaines</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Staff</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs RH.</p>
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
              await loadStaffState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = staffState?.diagnostics || [];
  const replayEntries = staffState?.replayLog?.entries || [];
  const trendLabels = replayEntries.map((entry) => `Cycle ${entry.cycleIndex + 1}`);
  const forecastDays = staffState?.forecast?.scenarios?.realiste?.days || [];
  const overloadNow = staffState?.overload || 1;
  const heatmapDays = sampleEvery(forecastDays, 5);
  const heatmapRows = [
    { label: "Housekeeping", cells: heatmapDays.map((entry) => ({ label: `J${entry.day}`, value: Math.round(((staffState.housekeepingLoad || 0) / overloadNow) * entry.overload) })) },
    { label: "Service", cells: heatmapDays.map((entry) => ({ label: `J${entry.day}`, value: Math.round(((staffState.serviceLoad || 0) / overloadNow) * entry.overload) })) },
  ];

  const hrMissions = (careerState.missions || []).filter((mission) => HR_KEYWORDS.test(`${mission.id} ${mission.title} ${mission.description || ""}`));
  const hrObjectives = (careerState.objectives || []).filter((objective) => HR_KEYWORDS.test(`${objective.id} ${objective.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ressources humaines</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Staff</h1>
          <p className="mt-1 text-sm text-slate-500">Moral, productivité, absentéisme, surcharge et turnover -- jour {careerState.day}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/staff/forecast"><Button variant="outline">Prévisions</Button></Link>
          <Link to="/staff/report"><Button variant="outline">Rapport complet</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!staffState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle RH…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Moral" value={`${staffState.morale}/100`} trend={staffState.morale >= 55 ? undefined : -1} />
            <KpiCard label="Productivité" value={`${staffState.productivity}/100`} />
            <KpiCard label="Absentéisme" value={`${staffState.absenteeism}%`} trend={staffState.absenteeism <= 15 ? undefined : -1} />
            <KpiCard label="Surcharge" value={`${staffState.overload}%`} trend={staffState.overload <= 100 ? undefined : -1} />
            <KpiCard label="Turnover" value={`${staffState.turnover.estimatedRate}%/mois`} />
            <KpiCard label="Masse salariale" value={`${staffState.payroll.total.toLocaleString()} €`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="Moral (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.morale)} />
            <BarChart title="Productivité (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.productivity)} />
            <AreaChart title="Absentéisme (par cycle)" labels={trendLabels} data={replayEntries.map((entry) => entry.absenteeism)} />
            <HeatmapChart title="Surcharge prévue (housekeeping / service)" rows={heatmapRows} />
          </div>

          <section aria-labelledby="staff-diagnostics" className="flex flex-col gap-3">
            <h2 id="staff-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics RH</h2>
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

          {(hrMissions.length > 0 || hrObjectives.length > 0) && (
            <section aria-labelledby="staff-career" className="flex flex-col gap-3">
              <h2 id="staff-career" className="text-base font-semibold text-slate-900">Progression RH (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions RH">
                  {hrMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission RH pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {hrMissions.map((mission) => (
                        <li key={mission.id} className="rounded-lg border border-slate-200 p-2">{mission.title} <span className="text-slate-500">({mission.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs RH">
                  {hrObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif RH pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {hrObjectives.map((objective) => (
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

          <section aria-labelledby="staff-actions" className="flex flex-col gap-3">
            <h2 id="staff-actions" className="text-base font-semibold text-slate-900">Actions RH</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {STAFF_ACTION_CATALOG.map((action) => (
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

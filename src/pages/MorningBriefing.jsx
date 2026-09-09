import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useMorningBriefing } from "../hooks/useMorningBriefing";

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

// "Morning Briefing" -- the first screen of the daily loop (Morning ->
// MyHotel -> Decisions -> Day -> Results, see pages/Dashboard.jsx). Route:
// /briefing. Read-only: no decision is taken here, see
// hooks/useMorningBriefing.js/lib/dashboard/morningBriefing.js.
export default function MorningBriefing() {
  const { briefing, isRunning, error, loadBriefing } = useMorningBriefing();

  useEffect(() => {
    loadBriefing().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!briefing) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Préparation de votre briefing…
        </span>
      </div>
    );
  }

  const { kpis } = briefing;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Briefing du matin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jour {briefing.day}</h1>
          {briefing.date && <p className="mt-1 text-sm text-slate-500">{briefing.date}</p>}
        </div>
        <Link to="/dashboard">
          <Button disabled={isRunning}>Aller à l'hôtel</Button>
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <section aria-labelledby="briefing-situation" className="flex flex-col gap-2">
        <h2 id="briefing-situation" className="text-base font-semibold text-slate-900">Situation</h2>
        <Card>
          <p className="text-sm text-slate-700">{briefing.situation}</p>
        </Card>
      </section>

      <section aria-labelledby="briefing-kpis" className="flex flex-col gap-2">
        <h2 id="briefing-kpis" className="text-base font-semibold text-slate-900">Chiffres du jour</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatRow label="Occupation" value={kpis.occupancyRate === null ? "—" : `${kpis.occupancyRate}%`} />
          <StatRow label="ADR" value={kpis.adr === null ? "—" : `${kpis.adr} €`} />
          <StatRow label="Trésorerie" value={kpis.cash === null || kpis.cash === undefined ? "—" : `${Math.round(kpis.cash).toLocaleString()} €`} />
          <StatRow label="Moral du personnel" value={kpis.staffMorale === null || kpis.staffMorale === undefined ? "—" : `${kpis.staffMorale}/100`} />
          <StatRow label="Avis clients" value={kpis.satisfaction === null || kpis.satisfaction === undefined ? "—" : `${kpis.satisfaction.toFixed(1)}/5`} />
          <StatRow label="Réputation" value={kpis.reputation === null || kpis.reputation === undefined ? "—" : `${kpis.reputation}/100`} />
        </div>
      </section>

      {briefing.objectives && (
        <section aria-labelledby="briefing-objectives" className="flex flex-col gap-2">
          <h2 id="briefing-objectives" className="text-base font-semibold text-slate-900">Objectifs du jour</h2>
          <Card>
            <p className="text-sm text-slate-700">
              Objectifs atteints : {briefing.objectives.achievedObjectivesCount}/{briefing.objectives.totalObjectives}
            </p>
            {briefing.objectives.acceptedMissions.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
                {briefing.objectives.acceptedMissions.map((mission) => (
                  <li key={mission.id}>• {mission.title || mission.id}</li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      <section aria-labelledby="briefing-alerts" className="flex flex-col gap-2">
        <h2 id="briefing-alerts" className="text-base font-semibold text-slate-900">Alertes</h2>
        <Card>
          {briefing.alerts.length === 0 ? (
            <p className="text-sm text-slate-500">Rien de particulier à signaler ce matin.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {briefing.alerts.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2 text-sm">
                  <span>{alert.message}</span>
                  <Link to={alert.moduleLink} className="shrink-0 text-xs font-semibold text-cyan-700 hover:underline">
                    Analyser →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

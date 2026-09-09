import { useEffect } from "react";
import { Link } from "react-router-dom";
import GameButton from "../ui/components/GameButton";
import GameCard from "../ui/components/GameCard";
import GameSection from "../ui/components/GameSection";
import { useMorningBriefing } from "../hooks/useMorningBriefing";
import { fadeIn, slideUp, delay } from "../ui/animations";

const KPI_ROWS = [
  { key: "occupancyRate", label: "Occupation", icon: "🛏️", format: (v) => `${v}%` },
  { key: "adr", label: "ADR", icon: "💵", format: (v) => `${v} €` },
  { key: "cash", label: "Trésorerie", icon: "💰", format: (v) => `${Math.round(v).toLocaleString()} €` },
  { key: "staffMorale", label: "Moral du personnel", icon: "👔", format: (v) => `${v}/100` },
  { key: "satisfaction", label: "Avis clients", icon: "⭐", format: (v) => `${v.toFixed(1)}/5` },
  { key: "reputation", label: "Réputation", icon: "🏆", format: (v) => `${v}/100` },
];

function KpiTile({ label, icon, value, index }) {
  return (
    <div
      style={delay(index)}
      className={`flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-transform duration-150 hover:-translate-y-0.5 ${slideUp}`}
    >
      <span className="flex items-center gap-2 text-sm text-slate-500">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

// "Morning Briefing" -- the first screen of the daily loop (Morning ->
// MyHotel -> Decisions -> Day -> Results, see pages/Dashboard.jsx). Route:
// /briefing. Read-only: no decision is taken here, see
// hooks/useMorningBriefing.js/lib/dashboard/morningBriefing.js. Restyled
// with the game design system (stylised KPI tiles, staggered
// slideUp/fadeIn entrance) -- every heading/label/link text is unchanged
// from before, so nothing that reads this page by role/text regresses.
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
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#e9ab1f]" />
          Préparation de votre briefing…
        </span>
      </div>
    );
  }

  const { kpis } = briefing;

  return (
    <div className="flex flex-col gap-6">
      <header className={`page-header ${slideUp}`}>
        <div>
          <p className="eyebrow">☀️ Briefing du matin</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Jour {briefing.day}</h1>
          {briefing.date && <p className="mt-1 text-sm text-slate-500">{briefing.date}</p>}
        </div>
        <Link to="/dashboard">
          <GameButton variant="gold" icon="🏨" disabled={isRunning}>Aller à l'hôtel</GameButton>
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <GameSection id="briefing-situation" title="Situation" icon="📊" className={fadeIn}>
        <GameCard>
          <p className="text-sm text-slate-700">{briefing.situation}</p>
        </GameCard>
      </GameSection>

      <GameSection id="briefing-kpis" title="Chiffres du jour" icon="📈">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KPI_ROWS.map((row, index) => {
            const rawValue = kpis[row.key];
            const value = rawValue === null || rawValue === undefined ? "—" : row.format(rawValue);
            return <KpiTile key={row.key} label={row.label} icon={row.icon} value={value} index={index} />;
          })}
        </div>
      </GameSection>

      {briefing.objectives && (
        <GameSection id="briefing-objectives" title="Objectifs du jour" icon="🎯">
          <GameCard>
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
          </GameCard>
        </GameSection>
      )}

      <GameSection id="briefing-alerts" title="Alertes" icon="🔔">
        <GameCard>
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
        </GameCard>
      </GameSection>
    </div>
  );
}

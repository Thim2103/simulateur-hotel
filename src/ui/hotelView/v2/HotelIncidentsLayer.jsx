import GameBadge from "../../components/GameBadge";
import { pulse } from "../../animations";

// The incidents layer: analyticsEngine's own diagnostics (see
// lib/analytics/analyticsEngine.js -- already computed by useCareer.js's
// nextDay() and surfaced as dashboardState.insights.diagnostics), filtered
// to the ones severe enough to show on the hotel itself ("error"
// diagnostics, or "anomaly" ones flagged high severity). Each pulses (see
// ui/animations) to draw the eye, same red vocabulary AttentionPanel/
// GameBadge already use elsewhere.
export default function HotelIncidentsLayer({ diagnostics = [] }) {
  const incidents = diagnostics.filter((d) => d.type === "error" || d.severity === "high");

  if (incidents.length === 0) {
    return <p className="text-xs text-slate-400">Aucun incident actif.</p>;
  }

  return (
    <ul aria-label="Incidents" className="flex flex-col gap-1.5">
      {incidents.map((incident, index) => (
        <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
          <span aria-hidden="true" className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-xs text-rose-600 ${pulse}`}>
            ❗
          </span>
          <span className="flex-1">{incident.message}</span>
          <GameBadge tone="high">{incident.severity || "high"}</GameBadge>
        </li>
      ))}
    </ul>
  );
}

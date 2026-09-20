import { useMemo } from "react";
import { useOptionalCareerContext } from "../../context/CareerContext";
import { useOptionalGmDesk } from "../gmDesk/GmDeskProvider";
import { buildStatusSummary } from "../../lib/dashboard/statusSummary";
import NotificationCenter from "./NotificationCenter";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

function Indicator({ icon, label, value, testId, tone }) {
  return (
    <div data-testid={testId} data-tone={tone} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1 sm:px-3 sm:py-1.5">
      <span aria-hidden="true" className="text-base leading-none">{icon}</span>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function dateLabel(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// The always-visible strip under the navigation: treasury, date and season,
// tonight's occupancy, the guests' average rating, and the notification
// centre. Draws nothing until there is a career to report on.
export default function StatusBar() {
  const career = useOptionalCareerContext();
  const gmDesk = useOptionalGmDesk();
  const careerState = career?.careerState ?? null;
  const gmMessages = gmDesk?.messages?.length ?? 0;
  const summary = useMemo(() => buildStatusSummary(careerState, { gmMessages }), [careerState, gmMessages]);

  if (!summary) return null;
  const { season, occupancy, rating } = summary;

  return (
    <div role="region" aria-label="Indicateurs de l'hôtel" data-testid="status-bar" className="sticky top-14 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 sm:gap-2 sm:px-6 sm:py-2 lg:px-8">
        <Indicator testId="status-treasury" icon="💵" label="Trésorerie" value={euro(summary.treasury)} tone="success" />
        <Indicator testId="status-date" icon={season.icon} label={`Jour ${summary.day}`} value={`${dateLabel(summary.date)} · ${season.label}`} tone="action" />
        <Indicator testId="status-occupancy" icon="🛏️" label="Occupation" value={`${occupancy.rate} % · ${occupancy.occupied}/${occupancy.total}`} tone={occupancy.rate >= 80 ? "success" : "action"} />
        <Indicator testId="status-rating" icon="⭐" label="Note des avis" value={rating.average === null ? "—" : `${rating.average.toFixed(1)}/5 · ${rating.count}`} tone="vip" />
        <div className="ml-auto">
          <NotificationCenter items={summary.notifications} />
        </div>
      </div>
    </div>
  );
}

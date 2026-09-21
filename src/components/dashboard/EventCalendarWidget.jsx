import { useState } from "react";
import { Link } from "react-router-dom";
import { BentoCard, SoftButton, StatusBadge } from "../../ui/bento";
import { describeSeason, eventCalendar, LONG_HORIZON, SHORT_HORIZON } from "../../lib/seasonEvents/seasonEventEngine";
import { getYieldConfig } from "../../lib/rm/yieldManagementEngine";

const HORIZONS = [
  { days: SHORT_HORIZON, label: "7 jours" },
  { days: LONG_HORIZON, label: "30 jours" },
];

const KIND_TONE = { demand: "success", nuisance: "vip", climate: "mice" };
const frDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value)} %`;

function whenText(event) {
  if (event.ongoing) return event.endsToday ? "dernier jour" : `en cours, jour ${event.dayNumber}/${event.totalDays}`;
  return `dans ${event.startsInDays} jour${event.startsInDays > 1 ? "s" : ""}`;
}

// The season, and the events to come: what the calendar holds for the next
// week or the next month, with what each does and what to do about it (see
// lib/seasonEvents/seasonEventEngine.js). Lets the player prepare -- prices
// through the yield desk, stocks at the restaurant -- before the crowd arrives.
// `onOpenGrowth` opens the yield & marketing desk.
export default function EventCalendarWidget({ hotelState, date, onOpenGrowth }) {
  const [horizon, setHorizon] = useState(SHORT_HORIZON);
  const season = describeSeason(date, hotelState);
  const events = eventCalendar(date, hotelState, horizon);
  const yieldConfig = getYieldConfig(hotelState);
  const eventPricing = yieldConfig.enabled && yieldConfig.events.enabled;

  return (
    <BentoCard title="Calendrier des événements" icon="🗓️" tone="mice" span={3} data-testid="event-calendar">
      <div className="flex flex-col gap-4">
        <div data-testid="event-calendar-season" data-season={season.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden="true" className="text-xl">{season.icon}</span>
            <strong className="text-sm text-slate-900">{season.label}</strong>
            <StatusBadge tone={season.tier === "high" ? "success" : season.tier === "low" ? "danger" : "neutral"}>{season.calendarLabel}</StatusBadge>
            {season.demandPercent !== 0 && <StatusBadge tone={season.demandPercent > 0 ? "success" : "danger"}>Demande {signed(season.demandPercent)}</StatusBadge>}
            {season.priceTolerancePercent > 0 && <StatusBadge tone="vip">Clients moins sensibles aux prix</StatusBadge>}
            {season.pro && <StatusBadge tone="mice" data-testid="event-calendar-pro">Clientèle Pro {season.proSharePercent} %</StatusBadge>}
          </div>
          <p className="text-xs text-slate-600">{season.description}</p>
          {season.advice && <p data-testid="event-calendar-advice" className="text-xs font-medium text-slate-800">{season.advice}</p>}
        </div>

        <div role="group" aria-label="Horizon du calendrier" className="flex gap-2">
          {HORIZONS.map((option) => (
            <button
              key={option.days}
              type="button"
              aria-pressed={horizon === option.days}
              onClick={() => setHorizon(option.days)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${horizon === option.days ? "bg-[var(--ds-mice)] text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {events.length === 0 ? (
          <p data-testid="event-calendar-empty" className="text-sm text-slate-500">
            Aucun événement annoncé dans les {horizon} prochains jours.
          </p>
        ) : (
          <ul data-testid="event-calendar-list" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {events.map((event) => (
              <li
                key={`${event.id}-${event.startDate}`}
                data-testid={`calendar-event-${event.id}`}
                data-kind={event.kind}
                data-ongoing={event.ongoing ? "true" : "false"}
                data-tone={KIND_TONE[event.kind] || "neutral"}
                className="flex flex-col gap-2 rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-3 shadow-[var(--ds-shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-lift)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    <span aria-hidden="true">{event.icon}</span> {event.name}
                  </p>
                  <span data-testid={`calendar-when-${event.id}`} className="text-xs font-medium text-slate-500">{whenText(event)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Du {frDate(event.startDate)} au {frDate(event.endDate)} ({event.totalDays} jour{event.totalDays > 1 ? "s" : ""})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {event.demandPercent !== 0 && <StatusBadge tone={event.demandPercent > 0 ? "success" : "danger"}>Demande {signed(event.demandPercent)}</StatusBadge>}
                  {event.priceTolerancePercent > 0 && <StatusBadge tone="vip">Tarifs jusqu'à +{event.priceTolerancePercent} %</StatusBadge>}
                  {event.premium && <StatusBadge tone="mice">Haut de gamme</StatusBadge>}
                  {event.satisfactionPenalty > 0 && <StatusBadge tone="danger">Satisfaction −{event.satisfactionPenalty} pts</StatusBadge>}
                </div>
                {event.advice && <p className="text-xs text-slate-700">{event.advice}</p>}
                {event.opportunity && (
                  <div className="flex flex-wrap items-center gap-2">
                    <SoftButton tone="success" icon="📈" data-testid={`calendar-prepare-${event.id}`} onClick={onOpenGrowth} className="!px-3 !py-1 !text-xs">
                      Préparer mes tarifs
                    </SoftButton>
                    <Link to="/restaurant/menu" className="text-xs font-semibold text-blue-700 hover:underline">Préparer le restaurant →</Link>
                    <StatusBadge tone={eventPricing ? "success" : "neutral"} data-testid={`calendar-yield-${event.id}`}>
                      {eventPricing ? "Tarifs événements activés" : "Tarifs événements à activer"}
                    </StatusBadge>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </BentoCard>
  );
}

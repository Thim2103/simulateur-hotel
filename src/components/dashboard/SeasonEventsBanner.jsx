const TIER_STYLES = {
  high: "border-amber-300 bg-amber-50 text-amber-900",
  low: "border-sky-300 bg-sky-50 text-sky-900",
  shoulder: "border-slate-200 bg-slate-50 text-slate-700",
};

const KIND_STYLES = {
  demand: "border-emerald-300 bg-emerald-50 text-emerald-900",
  climate: "border-orange-300 bg-orange-50 text-orange-900",
  audit: "border-violet-300 bg-violet-50 text-violet-900",
};

const signed = (value) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)} %`;

function eventTitle(event) {
  return [event.description, ...event.effects].filter(Boolean).join(" — ");
}

// The current season and the events in progress or coming up (see
// lib/hotelEvents/hotelEventsEngine.js describeCalendar()): what the day
// ahead looks like at a glance. Purely presentational.
export default function SeasonEventsBanner({ calendar }) {
  if (!calendar) return null;
  const { season, ongoing, upcoming } = calendar;

  return (
    <section data-testid="season-events-banner" aria-label="Saison et événements" className="flex flex-wrap items-center gap-2 text-xs">
      <span
        data-testid="season-badge"
        data-tier={season.tier}
        title={season.effects.join(" — ")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${TIER_STYLES[season.tier] || TIER_STYLES.shoulder}`}
      >
        <span aria-hidden="true">{season.icon}</span>
        <span>{season.label}</span>
        {season.demandPercent !== 0 && <span>· demande {signed(season.demandPercent)}</span>}
      </span>

      {ongoing.map((event) => (
        <span
          key={`ongoing-${event.id}`}
          data-testid={`event-ongoing-${event.id}`}
          title={eventTitle(event)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium ${KIND_STYLES[event.kind] || KIND_STYLES.demand}`}
        >
          <span aria-hidden="true">{event.icon}</span>
          <span>{event.name}</span>
          <span>
            · {event.endsToday ? "dernier jour" : `jour ${event.dayNumber}/${event.totalDays}`}
          </span>
        </span>
      ))}

      {upcoming.map((event) => (
        <span
          key={`upcoming-${event.id}`}
          data-testid={`event-upcoming-${event.id}`}
          title={eventTitle(event)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-400 px-3 py-1 font-medium text-slate-700"
        >
          <span aria-hidden="true">{event.icon}</span>
          <span>{event.name}</span>
          <span>· dans {event.startsInDays} j</span>
        </span>
      ))}
    </section>
  );
}

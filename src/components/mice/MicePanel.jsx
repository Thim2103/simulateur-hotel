import { useState } from "react";
import {
  STANDARD_DISCOUNT,
  MAX_DISCOUNT,
  bedroomsNeeded,
  computeQuote,
  conversionChance,
  guaranteedRevenue,
  lastOutcome,
  miceEvents,
  pendingRequests,
  requestFeasibility,
  roomCalendar,
} from "../../lib/mice/miceEngine";
import { toIsoDate, dayIndexOf } from "../../lib/hotelEvents/hotelEventsEngine";
import { SoftButton } from "../../ui/bento";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const percent = (value) => `${Math.round(value * 100)} %`;
const inDays = (from, to) => dayIndexOf(to) - dayIndexOf(from);
const frDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

// Quotes can start up to three weeks ahead and last up to three days.
const CALENDAR_DAYS = 28;

const OUTCOME_TEXT = {
  signed: (outcome) => ({ tone: "border-emerald-200 bg-emerald-50 text-emerald-900", text: `✅ Contrat signé : ${euro(outcome.total)} garantis. Les salles et les chambres sont réservées.` }),
  lost: () => ({ tone: "border-amber-200 bg-amber-50 text-amber-900", text: "😕 Le client a choisi un autre hôtel : votre offre n'était pas assez attractive." }),
  declined: () => ({ tone: "border-slate-200 bg-slate-50 text-slate-800", text: "Devis refusé." }),
};

// A rough reading of the chance the client signs, in words plus a figure to the
// nearest five points (what a sales manager would estimate).
function chanceLabel(chance) {
  const rounded = Math.round((chance * 100) / 5) * 5;
  const word = chance >= 0.65 ? "bonne" : chance >= 0.35 ? "moyenne" : "faible";
  return `${word} (≈ ${rounded} %)`;
}

function RequestCard({ request, rooms, reservations, date, onRespond }) {
  const [discount, setDiscount] = useState(String(Math.round(STANDARD_DISCOUNT * 100)));
  const [sent, setSent] = useState(false);
  const feasibility = requestFeasibility({ request, rooms, reservations });
  const parsed = Number(discount);
  const offered = Number.isFinite(parsed) && discount.trim() !== "" ? Math.max(0, Math.min(MAX_DISCOUNT, parsed / 100)) : STANDARD_DISCOUNT;
  const quoteAt = (rate) => computeQuote({ request, rooms, meetingRoom: feasibility.meetingRoom, bedrooms: feasibility.bedrooms, discount: rate });
  const rack = quoteAt(0); // the public price, before any group discount
  const standard = quoteAt(STANDARD_DISCOUNT);
  const offer = quoteAt(offered);
  const endDate = toIsoDate(new Date(dayIndexOf(request.startDate) * 86400000 + (request.days - 1) * 86400000));
  const rooms_ = bedroomsNeeded(request.attendees, request.days);
  const disabled = !feasibility.ok || sent;

  const send = (action) => {
    setSent(true);
    onRespond?.(request.id, action);
  };

  return (
    <li data-testid={`mice-request-${request.id}`} data-feasible={feasibility.ok ? "true" : "false"} data-tone="mice" className="flex flex-col gap-2 rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-4 text-sm shadow-[var(--ds-shadow-card)] transition hover:shadow-[var(--ds-shadow-lift)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">
          🤝 {request.company} — {request.attendees} personnes, {request.days} jour{request.days > 1 ? "s" : ""}
        </p>
        <span className="text-xs text-slate-500">Expire dans {Math.max(0, inDays(date, request.expiresOn))} j</span>
      </div>
      <p className="text-xs text-slate-600">
        Du {frDate(request.startDate)} au {frDate(endDate)} (dans {inDays(date, request.startDate)} jours) · {feasibility.meetingRoom ? `salle ${feasibility.meetingRoom.number}` : "salle de réunion"} · restauration (pauses café + déjeuner)
        {rooms_ > 0 ? ` · ${rooms_} chambre(s) Standard/Deluxe` : " · sans hébergement"}
      </p>
      {!feasibility.ok && (
        <p data-testid={`mice-reason-${request.id}`} className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          Impossible à accueillir : {feasibility.reason}.
        </p>
      )}
      <p data-testid={`mice-rack-${request.id}`} className="text-xs text-slate-600">
        Tarif public : <strong>{euro(rack.total)}</strong> (salle {euro(rack.meeting)} · restauration {euro(rack.catering)}
        {rack.accommodation > 0 ? ` · hébergement ${euro(rack.accommodation)}` : ""})
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <SoftButton tone="success" data-testid={`mice-accept-${request.id}`} disabled={disabled} onClick={() => send({ type: "accept" })} className="!px-3 !py-1.5 !text-xs">
          Accepter (−{percent(STANDARD_DISCOUNT)}) · {euro(standard.total)}
        </SoftButton>
        <label className="flex flex-col gap-0.5 text-xs text-slate-600">
          Remise de groupe (0 à {percent(MAX_DISCOUNT)})
          <input
            type="number"
            data-testid={`mice-discount-${request.id}`}
            min={0}
            max={Math.round(MAX_DISCOUNT * 100)}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </label>
        <SoftButton tone="mice" data-testid={`mice-negotiate-${request.id}`} disabled={disabled} onClick={() => send({ type: "negotiate", discount: offered })} className="!px-3 !py-1.5 !text-xs">
          Proposer ce tarif
        </SoftButton>
        <SoftButton tone="neutral" data-testid={`mice-decline-${request.id}`} disabled={sent} onClick={() => send({ type: "decline" })} className="!px-3 !py-1.5 !text-xs">
          Refuser
        </SoftButton>
      </div>
      <p data-testid={`mice-chance-${request.id}`} className="text-xs text-slate-600">
        À {percent(offered)} de remise : chance de signature <strong>{chanceLabel(conversionChance(request, offered))}</strong> · chiffre d'affaires garanti <strong>{euro(offer.total)}</strong>
      </p>
    </li>
  );
}

// The MICE desk (see lib/mice/miceEngine.js): the quotes waiting for an
// answer, the events already signed, the meeting rooms' calendar and the
// revenue those events are guaranteed to bring. `onRespond(requestId, action)`
// answers a quote (accept, negotiate, decline) -- Dashboard.jsx and the
// /corporate/events page wire it to respondToRequest() through
// applyHotelAdjustment(). Shared by MiceBookingModal and the page.
export default function MicePanel({ hotelState, rooms, reservations, date, onRespond }) {
  const today = date ?? new Date();
  const pending = pendingRequests(hotelState, today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const events = miceEvents(hotelState);
  const upcoming = events.filter((event) => event.status === "confirmed").sort((a, b) => a.startDate.localeCompare(b.startDate));
  const done = events.filter((event) => event.status === "done").slice(-5).reverse();
  const outcome = lastOutcome(hotelState);
  const calendar = roomCalendar({ hotelState, rooms, reservations, date: today, days: CALENDAR_DAYS });
  const banner = outcome && OUTCOME_TEXT[outcome.outcome] ? OUTCOME_TEXT[outcome.outcome](outcome) : null;

  return (
    <div data-testid="mice-panel" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <span data-testid="mice-forecast" data-tone="success" className="rounded-2xl bg-[var(--tone-soft)] px-3 py-2">
          Chiffre d'affaires garanti : <strong>{euro(guaranteedRevenue(hotelState, today))}</strong>
        </span>
        <span data-testid="mice-pending-count" data-tone="mice" className="rounded-2xl bg-[var(--tone-soft)] px-3 py-2">{pending.length} devis en attente</span>
      </div>

      {banner && (
        <p data-testid="mice-outcome" data-outcome={outcome.outcome} className={`rounded-2xl border p-3 text-sm ${banner.tone}`}>
          {banner.text}
        </p>
      )}

      <section aria-labelledby="mice-requests" className="flex flex-col gap-2">
        <h3 id="mice-requests" className="text-sm font-semibold text-slate-900">
          Devis en attente
        </h3>
        {calendar.length === 0 ? (
          <p data-testid="mice-no-room" className="text-sm text-slate-600">
            Vous n'avez aucune salle de réunion : aménagez-en une (salle de séminaire ou de conférence) dans un étage de l'extension pour recevoir des demandes.
          </p>
        ) : pending.length === 0 ? (
          <p data-testid="mice-none" className="text-sm text-slate-600">
            Aucune demande en attente. Les entreprises vous écrivent régulièrement : repassez après quelques jours.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((request) => (
              <RequestCard key={request.id} request={request} rooms={rooms} reservations={reservations} date={today} onRespond={onRespond} />
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="mice-events" className="flex flex-col gap-2">
          <h3 id="mice-events" className="text-sm font-semibold text-slate-900">
            Événements confirmés
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {upcoming.map((event) => (
              <li key={event.id} data-testid={`mice-event-${event.id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                🤝 {event.company} — {event.attendees} personnes · du {frDate(event.startDate)} au {frDate(event.endDate)} · salle {event.meetingRoomNumber} · <strong>{euro(event.quote.total)}</strong> garantis
              </li>
            ))}
          </ul>
        </section>
      )}

      {calendar.length > 0 && (
        <section aria-labelledby="mice-calendar" className="flex flex-col gap-2">
          <h3 id="mice-calendar" className="text-sm font-semibold text-slate-900">
            Occupation des salles ({CALENDAR_DAYS} jours)
          </h3>
          {calendar.map((entry) => (
            <div key={entry.roomId} data-testid={`mice-calendar-${entry.roomId}`} className="flex flex-col gap-1">
              <p className="text-xs text-slate-600">
                Salle {entry.number} · {entry.capacity} personnes
              </p>
              <div className="flex flex-wrap gap-0.5">
                {entry.days.map((day) => (
                  <span
                    key={day.date}
                    data-testid={`mice-cal-${entry.roomId}-${day.date}`}
                    data-busy={day.busy === null ? "free" : day.busy === "other" ? "other" : "event"}
                    title={`${frDate(day.date)} : ${day.busy === null ? "libre" : day.busy === "other" ? "réservée" : "séminaire"}`}
                    className={`h-4 w-4 rounded-md ${day.busy === null ? "bg-slate-200" : day.busy === "other" ? "bg-amber-400" : "bg-[var(--ds-mice)]"}`}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Gris : libre · violet : séminaire signé · orange : autre réservation.</p>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="mice-done" className="flex flex-col gap-1">
          <h3 id="mice-done" className="text-sm font-semibold text-slate-900">
            Événements terminés
          </h3>
          <ul className="flex flex-col gap-1 text-xs text-slate-700">
            {done.map((event) => (
              <li key={event.id} data-testid={`mice-done-${event.id}`}>
                {event.company} — {event.attendees} personnes · {euro(event.quote.total)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

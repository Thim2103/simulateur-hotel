import { useState } from "react";
import { Link } from "react-router-dom";
import GameModal from "../../components/GameModal";
import { describeVipGuests, vipActionOptions, TARGET_SATISFACTION, PRAISE_BONUS_MIN, PRAISE_BONUS_SPAN } from "../../../lib/clients/vipServiceEngine";
import { ZONE_STYLES } from "./schematicTokens";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const signed = (value) => `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
const followersText = (followers) => `${followers.toLocaleString("fr-FR")} abonnés`;

function gaugeTone(score) {
  if (score >= TARGET_SATISFACTION) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

// The V.I.P. welcome (see lib/clients/vipServiceEngine.js): the guest's
// profile and audience, their satisfaction gauge with what makes it up, what
// their review will be worth when they leave, and the attentions the player
// can still give them -- an upgrade, a welcome gift, a personal service --
// each with its cost and why it may be unavailable. `onAct(action)` gives an
// attention -- Dashboard.jsx wires it to applyVipAction() through
// applyHotelAdjustment(); the modal follows the hotel's live state.
export default function VipActionModal({ reservationId, hotelState, reservations, rooms, date, onAct, onClose }) {
  const [requested, setRequested] = useState(null);
  const context = { hotelState, reservations, rooms, date };
  const guest = describeVipGuests(context).find((item) => item.reservationId === reservationId);
  const options = guest ? vipActionOptions(context, reservationId) : [];

  const handleGive = (option) => {
    setRequested(option.id);
    onAct?.(option.type === "gift" ? { type: "gift", giftId: option.giftId } : { type: option.type });
  };

  return (
    <GameModal open onClose={onClose} title="⭐ Accueil V.I.P." className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
      {!guest ? (
        <p data-testid="vip-gone" className="text-sm text-slate-600">
          Ce client n'est plus dans l'hôtel.
        </p>
      ) : (
        <>
          <div data-testid="vip-profile" className="flex flex-col gap-0.5 text-sm">
            <p className="font-semibold text-slate-900">
              {guest.profile.icon} {guest.guestName} — {guest.profile.label}
            </p>
            <p className="text-xs text-slate-600">
              Chambre {guest.roomNumber} · {followersText(guest.followers)} · départ le {guest.departure}
            </p>
            <p className="text-xs text-slate-500">{guest.profile.description}</p>
          </div>

          <section data-testid="vip-satisfaction" className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-slate-800">Satisfaction</span>
              <span data-testid="vip-score" className="text-slate-700">
                <strong>{guest.satisfaction}</strong>/100 — objectif {TARGET_SATISFACTION}
              </span>
            </div>
            <div
              role="meter"
              aria-label="Satisfaction du V.I.P."
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={guest.satisfaction}
              data-testid="vip-gauge"
              className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200"
            >
              <div data-testid="vip-gauge-bar" className={`h-full rounded-full transition-all ${gaugeTone(guest.satisfaction)}`} style={{ width: `${guest.satisfaction}%` }} />
              <div data-testid="vip-gauge-target" className="absolute top-0 h-full w-0.5 bg-slate-800" style={{ left: `${TARGET_SATISFACTION}%` }} />
            </div>
            {guest.lines.length > 0 && (
              <ul data-testid="vip-lines" className="flex flex-wrap gap-2 text-xs">
                {guest.lines.map((line) => (
                  <li key={line.key} data-testid={`vip-line-${line.key}`} className={`rounded-full border px-2 py-0.5 ${line.value > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                    {line.label} {signed(line.value)}
                  </li>
                ))}
              </ul>
            )}
            <p data-testid="vip-outcome" data-reached={guest.reached ? "true" : "false"} className={`rounded-lg p-2 text-xs ${guest.reached ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-700"}`}>
              {guest.reached && guest.attentions.length > 0
                ? `Avis élogieux attendu au départ : +${PRAISE_BONUS_MIN} à +${PRAISE_BONUS_MIN + PRAISE_BONUS_SPAN - 1} points de réputation en plus du poids ×3, et un article à la une.`
                : guest.reached
                  ? "Séjour parfait : cinq étoiles au départ. Une attention en plus en ferait un avis élogieux (boost de réputation et article à la une)."
                  : `Il manque ${TARGET_SATISFACTION - guest.satisfaction} points pour un avis élogieux : accordez-lui des attentions avant son départ.`}
            </p>
          </section>

          <ul className="flex flex-col gap-2">
            {options.map((option) => (
              <li key={option.id} data-testid={`vip-option-${option.id}`} data-available={option.available ? "true" : "false"} data-done={option.done ? "true" : "false"} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {option.label}
                    <span className="ml-2 text-xs font-normal text-slate-600">{option.cost > 0 ? euro(option.cost) : "Gratuit"}</span>
                  </p>
                  <p className="text-xs text-slate-600">{option.description}</p>
                  <p className="text-xs text-emerald-800">Satisfaction {option.bonus}</p>
                  {option.reason && <p className={`text-xs ${option.done ? "text-emerald-700" : "text-rose-700"}`}>{option.done ? `✅ ${option.reason}` : option.reason}</p>}
                </div>
                <button
                  type="button"
                  data-testid={`vip-give-${option.id}`}
                  disabled={!option.available || requested === option.id}
                  onClick={() => handleGive(option)}
                  className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Accorder
                </button>
              </li>
            ))}
          </ul>

          <Link to={ZONE_STYLES.room.route} onClick={onClose} className="text-xs font-medium text-cyan-700 underline">
            Voir la fiche de la chambre →
          </Link>
        </>
      )}
    </GameModal>
  );
}

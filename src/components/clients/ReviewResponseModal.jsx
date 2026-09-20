import { useState } from "react";
import GameModal from "../../ui/components/GameModal";
import { PROFILES } from "../../lib/clients/guestProfiles";
import { responseOptions, currentImpact } from "../../lib/clients/guestReviewEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
export const points = (value) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1).replace(".", ",")}`;

const CHOICE_TONE = {
  courteous: "border-cyan-700 text-cyan-800 hover:bg-cyan-50",
  gesture: "border-emerald-700 text-emerald-800 hover:bg-emerald-50",
  ignore: "border-slate-400 text-slate-700 hover:bg-slate-50",
  aggressive: "border-rose-600 text-rose-700 hover:bg-rose-50",
};

// Answering a guest review (see lib/clients/guestReviewEngine.js): what the
// review is worth for the hotel's reputation, and each answer the player can
// give -- courteous reply, commercial gesture, ignoring it or a hostile
// reply -- with what it costs and what the review would then be worth.
// `onRespond(type)` does the actual answering (the Clients -> Avis page wires
// it to respondToReview() through applyHotelAdjustment()).
export default function ReviewResponseModal({ hotelState, review, onRespond, onClose }) {
  const [chosen, setChosen] = useState(null);
  const options = responseOptions(hotelState, review);
  const profile = review.profile ? PROFILES[review.profile] : null;

  const handleChoose = (type) => {
    setChosen(type);
    onRespond?.(type);
  };

  return (
    <GameModal open onClose={onClose} title="Répondre à un avis" className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
      <div data-testid="response-review" className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-amber-600" aria-label={`Note ${review.rating} sur 5`}>
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </span>
          {profile && (
            <span data-testid="response-profile" className="text-xs font-medium text-slate-700">
              {profile.icon} {profile.label}
            </span>
          )}
          {review.weight > 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">poids ×{review.weight}</span>}
          <span className="text-xs text-slate-500">Jour {review.day}</span>
        </div>
        <p className="text-slate-700">« {review.text} »</p>
        <p data-testid="response-impact" className="text-xs text-slate-600">
          Impact actuel sur la réputation : <strong>{points(currentImpact(review))}</strong> point(s)
        </p>
      </div>

      {review.response ? (
        <p data-testid="response-done" className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
          Vous avez déjà répondu à cet avis.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {options.map((option) => (
            <li key={option.type} data-testid={`response-option-${option.type}`} data-available={option.available ? "true" : "false"} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {option.label}
                  {option.cost > 0 && <span className="ml-2 text-xs font-normal text-slate-600">{euro(option.cost)}</span>}
                </p>
                <p className="text-xs text-slate-600">{option.description}</p>
                <p className="text-xs text-slate-500">
                  Impact : {points(currentImpact(review))} → <strong>{points(option.resulting)}</strong>
                </p>
                {option.reason && <p className="text-xs text-rose-700">{option.reason}</p>}
              </div>
              <button
                type="button"
                data-testid={`response-choose-${option.type}`}
                disabled={!option.available || chosen !== null}
                onClick={() => handleChoose(option.type)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent ${CHOICE_TONE[option.type]}`}
              >
                Choisir
              </button>
            </li>
          ))}
        </ul>
      )}
    </GameModal>
  );
}

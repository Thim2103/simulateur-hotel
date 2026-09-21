import { useState } from "react";
import GameModal from "../../ui/components/GameModal";
import { SoftButton, StatusBadge } from "../../ui/bento";
import { crisisOptions, describeActiveCrisis, describeRehab, lastOutcome, STRATEGIES } from "../../lib/mediaCrisis/mediaCrisisEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const days = (count) => `${count} jour${count > 1 ? "s" : ""}`;

// What each answer would leave, in words, for the crisis as it stands.
function effectText(id, crisis) {
  if (id === "apology") return `La crise passerait de ${days(crisis.daysLeft)} à ${days(Math.ceil(crisis.daysLeft / 2))}.`;
  if (id === "audit") return "La crise s'arrête aujourd'hui, la campagne de réhabilitation démarre.";
  return "Aucun effet immédiat : la crise suit son cours.";
}

// The media crisis desk (see lib/mediaCrisis/mediaCrisisEngine.js): what
// happened, what it costs the hotel every day, and the three ways to answer --
// deny, apologise, or open the hotel to independent audits. `onRespond(type)`
// gives the answer; Dashboard.jsx wires it to respondToCrisis() through
// applyHotelAdjustment(), and the modal follows the hotel's live state.
export default function MediaCrisisModal({ hotelState, date, onRespond, onClose }) {
  const [requested, setRequested] = useState(null);
  const crisis = describeActiveCrisis(hotelState, date);
  const options = crisisOptions(hotelState, date);
  const outcome = lastOutcome(hotelState);
  const rehab = describeRehab(hotelState, date);

  const choose = (id) => {
    setRequested(id);
    onRespond?.(id);
  };

  return (
    <GameModal open onClose={onClose} title="🚨 Crise médiatique" tone="danger" className="flex max-h-[85vh] max-w-xl flex-col gap-4 overflow-y-auto">
      {outcome && (
        <p data-testid="crisis-outcome" data-outcome={outcome.type} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {outcome.text}
        </p>
      )}

      {rehab && (
        <p data-testid="crisis-rehab" data-tone="success" className="rounded-2xl bg-[var(--tone-soft)] p-3 text-sm text-emerald-900">
          🛡️ <strong>« {rehab.title} »</strong> : +{rehab.boostPercent} % d'attractivité, encore {days(rehab.daysLeft)}.
        </p>
      )}

      {!crisis ? (
        <p data-testid="crisis-none" className="text-sm text-slate-600">
          Aucune crise en cours : la presse parle d'autre chose. Gardez l'œil sur vos avis, vos contrôles d'hygiène et vos équipements.
        </p>
      ) : (
        <>
          <div data-testid="crisis-summary" data-tone="danger" className="flex flex-col gap-2 rounded-2xl bg-[var(--tone-soft)] p-3">
            <p className="text-sm font-semibold text-slate-900">
              <span aria-hidden="true">{crisis.icon}</span> {crisis.title}
            </p>
            <p className="text-xs text-slate-700">{crisis.story}</p>
            <p className="text-xs text-slate-500">Origine : {crisis.causeText}.</p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge tone="danger" data-testid="crisis-reputation">Réputation −{crisis.reputationPenalty} pts</StatusBadge>
              <StatusBadge tone="danger" data-testid="crisis-demand">Demande −{crisis.demandDropPercent} %</StatusBadge>
              <StatusBadge tone="vip" data-testid="crisis-days">{days(crisis.daysLeft)} restant{crisis.daysLeft > 1 ? "s" : ""}</StatusBadge>
              {crisis.worsened && <StatusBadge tone="danger" data-testid="crisis-worsened">Aggravée par une contre-expertise</StatusBadge>}
              {crisis.silenceExtended && !crisis.decided && <StatusBadge tone="vip" data-testid="crisis-silence">Prolongée par votre silence</StatusBadge>}
            </div>
          </div>

          {!crisis.decided && <p className="text-xs text-slate-600">Sans réponse sous deux jours, votre silence prolongera la crise de deux jours.</p>}

          <ul className="flex flex-col gap-2">
            {options.map((option) => {
              const chosen = crisis.decision?.type === option.id;
              return (
                <li
                  key={option.id}
                  data-testid={`crisis-option-${option.id}`}
                  data-available={option.available ? "true" : "false"}
                  data-chosen={chosen ? "true" : "false"}
                  className={`flex flex-col gap-2 rounded-2xl border p-3 shadow-[var(--ds-shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-lift)] ${chosen ? "border-emerald-300 bg-emerald-50/60" : "border-[var(--ds-border)] bg-white"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      <span aria-hidden="true">{option.icon}</span> {option.label}
                      <StatusBadge tone={option.cost > 0 ? "neutral" : "success"} className="ml-2 !py-0 !text-[11px]">{option.cost > 0 ? euro(option.cost) : "Gratuit"}</StatusBadge>
                    </p>
                    <SoftButton tone={option.id === "audit" ? "success" : option.id === "apology" ? "action" : "neutral"} data-testid={`crisis-choose-${option.id}`} disabled={!option.available || requested === option.id} onClick={() => choose(option.id)} className="!px-3 !py-1.5 !text-xs">
                      {chosen ? "✓ Choisi" : "Choisir"}
                    </SoftButton>
                  </div>
                  <p className="text-xs text-slate-600">{STRATEGIES[option.id].description}</p>
                  <p className="text-xs font-medium text-slate-700">{effectText(option.id, crisis)}</p>
                  {option.reason && !chosen && (
                    <p data-testid={`crisis-reason-${option.id}`} className="text-xs text-rose-700">
                      {option.reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </GameModal>
  );
}

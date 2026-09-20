import { useState } from "react";
import GameModal from "../../components/GameModal";
import {
  UPGRADES,
  upgradesForZone,
  zoneSummary,
  upgradeStatus,
  availableCapital,
  describeEffects,
  levelStars,
} from "../../../lib/zones/zoneUpgradesEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

// Why an upgrade can't be started, in the player's words.
function statusText(status, upgrade, works) {
  switch (status) {
    case "installed":
      return "✅ Installé";
    case "in-progress":
      return `🚧 Travaux en cours — terminés au jour ${works?.completesOnDay}`;
    case "zone-busy":
      return "Une autre amélioration de cette zone est en travaux";
    case "locked":
      return `Nécessite : ${(upgrade.requires || []).map((id) => UPGRADES[id]?.name).join(", ")}`;
    case "no-funds":
      return "Fonds insuffisants";
    default:
      return "";
  }
}

// The schematic view's own upgrade modal for one zone (see
// lib/zones/zoneUpgradesEngine.js): what can be improved, what it costs,
// what it brings, and a button to start the works. `hotelState` is the
// hotel's current state (level, installed upgrades, works in progress and
// the capital that pays for them all come from it); `onStart(upgradeId)`
// is what actually spends the capital -- Dashboard.jsx wires it to
// startUpgrade() through applyHotelAdjustment().
export default function ZoneUpgradeModal({ zoneId, hotelState, day = 0, onStart, onClose }) {
  const [requested, setRequested] = useState(null);
  const summary = zoneSummary(hotelState, zoneId);
  const upgrades = upgradesForZone(zoneId);
  const capital = availableCapital(hotelState);

  const handleStart = (upgradeId) => {
    setRequested(upgradeId);
    onStart?.(upgradeId);
  };

  return (
    <GameModal open onClose={onClose} title={`${summary.icon} ${summary.label}`} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between text-sm">
        <span data-testid="zone-level" aria-label={`Niveau ${summary.level} sur ${summary.maxLevel}`} className="text-base">
          {levelStars(summary.level, summary.maxLevel)}
        </span>
        <span data-testid="zone-capital" className="text-slate-600">
          Capital disponible : <strong>{euro(capital)}</strong>
        </span>
      </div>

      {summary.works && (
        <p data-testid="zone-works" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          🚧 Travaux en cours : {UPGRADES[summary.works.upgradeId]?.name} (terminés au jour {summary.works.completesOnDay}). Ils perturbent temporairement la zone.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {upgrades.map((upgrade) => {
          const status = upgradeStatus(hotelState, upgrade.id);
          const startable = status === "available" && requested !== upgrade.id;
          const works = status === "in-progress" ? summary.works : null;
          return (
            <li key={upgrade.id} data-testid={`upgrade-${upgrade.id}`} data-status={status} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{upgrade.name}</p>
                <p className="text-xs text-slate-600">{upgrade.description}</p>
              </div>
              <ul className="flex flex-col gap-0.5 text-xs text-emerald-800">
                {describeEffects(upgrade.effects).map((line) => (
                  <li key={line}>＋ {line}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  {euro(upgrade.cost)} · {upgrade.days} j de travaux
                </span>
                {status === "available" || status === "no-funds" || status === "zone-busy" || status === "locked" ? (
                  <button
                    type="button"
                    disabled={!startable}
                    onClick={() => handleStart(upgrade.id)}
                    className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Lancer les travaux
                  </button>
                ) : null}
              </div>
              {statusText(status, upgrade, works) && (
                <p data-testid={`upgrade-${upgrade.id}-status`} className={`text-xs ${status === "installed" ? "text-emerald-700" : status === "in-progress" ? "text-amber-700" : "text-slate-500"}`}>
                  {statusText(status, upgrade, works)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">Jour {day}. Les bénéfices s'appliquent à la fin des travaux.</p>
    </GameModal>
  );
}

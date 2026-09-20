import { useState } from "react";
import GameModal from "../../components/GameModal";
import { ZONE_STYLES } from "./schematicTokens";
import { REPAIR_COST, EMERGENCY_COST_MULTIPLIER, standardRepairDelay } from "../../../lib/maintenance/incidentEngine";

// The schematic view's own direct-action modal for an amenity carrying a
// real, persistent incident (see lib/maintenance/incidentEngine.js and
// directActions.js's own docstring for how this gets registered and
// opened). `entity` is the generic amenity entity EntityFactory.js
// produces -- `metadata.message`/`severity`/`incidentId`/`repairEtaDay`,
// the real incident behind the alert (see EntityFactory.js's own
// `buildAmenityEntitiesFromIncidents()`), never a raw incident/diagnostic
// object.
//
// Both actions take REAL effect: `onCallTechnician` (standard repair --
// the exact cost, no premium) and `onRepairNow` (emergency repair, at
// EMERGENCY_COST_MULTIPLIER the cost, resolved on the spot) both go
// through Dashboard.jsx's own `handleRepairIncident()`, which calls
// incidentEngine.payForRepair() via the same applyHotelAdjustment()
// primitive every other real Quick Action persists through. Cost/delay
// shown here are the exact REPAIR_COST/REPAIR_DELAY_DAYS values that
// engine will actually apply -- not an estimate -- falling back to
// `entity.metadata.severity`'s own tier only if the entity doesn't
// already carry its own `repairCost` (e.g. in an isolated test).
//
// `repairTerms` (incidentEngine.repairTerms(), passed down from
// Dashboard.jsx) carries what an in-house technician changes: a cheaper
// emergency call and a faster standard repair. Without it the modal shows
// the external-contractor terms.
export default function IncidentQuickModal({ entity, onClose, onRepairNow, onCallTechnician, repairTerms }) {
  const [submitted, setSubmitted] = useState(null);
  const zoneLabel = ZONE_STYLES[entity.type]?.label || ZONE_STYLES.default.label;
  const severity = entity.metadata?.severity || "moderate";
  const standardCost = entity.metadata?.repairCost ?? REPAIR_COST[severity] ?? REPAIR_COST.moderate;
  const emergencyCost = Math.round(standardCost * (repairTerms?.emergencyMultiplier ?? EMERGENCY_COST_MULTIPLIER));
  const delayDays = standardRepairDelay(severity, repairTerms);
  const isRepairing = entity.state === "repairing";

  const handleRepairNow = () => {
    onRepairNow?.(entity);
    setSubmitted("repaired");
  };
  const handleCallTechnician = () => {
    onCallTechnician?.(entity);
    setSubmitted("technician-called");
  };

  const actionsDisabled = isRepairing || !!submitted;

  return (
    <GameModal open onClose={onClose} title={`Panne — ${zoneLabel}`} className="flex flex-col gap-4">
      <p data-testid="incident-modal-message" className="text-sm text-slate-700">
        {entity.metadata?.message || "Un problème technique a été signalé sur cette zone."}
      </p>

      {repairTerms?.hasTechnician && !isRepairing && (
        <p data-testid="incident-modal-technician-note" className="text-xs text-emerald-700">
          Un technicien de l'hôtel est disponible : tarif d'urgence réduit et intervention plus rapide.
        </p>
      )}

      {isRepairing ? (
        <p data-testid="incident-modal-repairing" className="text-sm text-amber-700">
          Réparation en cours{entity.metadata?.repairEtaDay != null ? ` — prête au jour ${entity.metadata.repairEtaDay}` : ""}.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt className="font-semibold text-slate-500">Réparation standard</dt>
            <dd data-testid="incident-modal-standard-cost">
              {standardCost} € — {delayDays} j
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Réparation d'urgence</dt>
            <dd data-testid="incident-modal-emergency-cost">{emergencyCost} € — immédiat</dd>
          </div>
        </dl>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCallTechnician}
          disabled={actionsDisabled}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Appeler un technicien ({standardCost} €, {delayDays} j)
        </button>
        <button
          type="button"
          onClick={handleRepairNow}
          disabled={actionsDisabled}
          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Réparation d'urgence ({emergencyCost} €, immédiat)
        </button>
        {submitted === "repaired" && (
          <p data-testid="incident-modal-confirmation" className="text-sm text-emerald-700">
            Réparation d'urgence lancée — résolue immédiatement.
          </p>
        )}
        {submitted === "technician-called" && (
          <p data-testid="incident-modal-confirmation" className="text-sm text-emerald-700">
            Technicien appelé — réparation en cours.
          </p>
        )}
      </div>
    </GameModal>
  );
}

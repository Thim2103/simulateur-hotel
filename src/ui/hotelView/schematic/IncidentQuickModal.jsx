import { useState } from "react";
import GameModal from "../../components/GameModal";
import { ZONE_STYLES } from "./schematicTokens";

// Cost/delay are not real data -- see this file's own docstring below --
// so they're derived from the diagnostic's own `severity` (real data,
// see EntityFactory.js's own `relevantDiagnostic()`) rather than
// fabricated per incident. Clearly labelled "estimation" in the UI.
const SEVERITY_ESTIMATES = {
  high: { cost: "400 € – 600 €", delay: "2 à 4 heures" },
  medium: { cost: "150 € – 350 €", delay: "4 à 8 heures" },
  low: { cost: "50 € – 150 €", delay: "sous 24 heures" },
};

// The schematic view's own direct-action modal for an amenity carrying an
// open incident (see directActions.js's own docstring for how this gets
// registered and opened). `entity` is the generic amenity entity
// EntityFactory.js produces -- `metadata.message`/`metadata.severity`
// only (the real diagnostic behind the alert, see EntityFactory.js's own
// `buildAmenityEntities()`), never a raw `diagnostics[]` object.
//
// There is no incident-resolution engine anywhere in this codebase yet
// (diagnostics are recomputed fresh each cycle, not persisted, addressable
// records -- see lib/analytics/analyticsDiagnostics.js) -- so
// "Réparer immédiatement"/"Appeler un technicien" call the optional
// `onRepairNow`/`onCallTechnician` props if the caller supplies real
// wiring, and always show a local confirmation either way so the modal
// isn't a dead end while that real wiring doesn't exist yet.
export default function IncidentQuickModal({ entity, onClose, onRepairNow, onCallTechnician }) {
  const [action, setAction] = useState(null);
  const zoneLabel = ZONE_STYLES[entity.type]?.label || ZONE_STYLES.default.label;
  const severity = entity.metadata?.severity || "medium";
  const estimate = SEVERITY_ESTIMATES[severity] || SEVERITY_ESTIMATES.medium;

  const handleRepairNow = () => {
    onRepairNow?.(entity);
    setAction("repaired");
  };
  const handleCallTechnician = () => {
    onCallTechnician?.(entity);
    setAction("technician-called");
  };

  return (
    <GameModal open onClose={onClose} title={`Panne — ${zoneLabel}`} className="flex flex-col gap-4">
      <p data-testid="incident-modal-message" className="text-sm text-slate-700">
        {entity.metadata?.message || "Un problème technique a été signalé sur cette zone."}
      </p>

      <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <dt className="font-semibold text-slate-500">Coût estimé</dt>
          <dd data-testid="incident-modal-cost">{estimate.cost}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Délai estimé</dt>
          <dd data-testid="incident-modal-delay">{estimate.delay}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRepairNow}
          disabled={!!action}
          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Réparer immédiatement
        </button>
        <button
          type="button"
          onClick={handleCallTechnician}
          disabled={!!action}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Appeler un technicien
        </button>
        {action === "repaired" && (
          <p data-testid="incident-modal-confirmation" className="text-sm text-emerald-700">
            Réparation lancée immédiatement.
          </p>
        )}
        {action === "technician-called" && (
          <p data-testid="incident-modal-confirmation" className="text-sm text-emerald-700">
            Un technicien a été appelé.
          </p>
        )}
      </div>
    </GameModal>
  );
}

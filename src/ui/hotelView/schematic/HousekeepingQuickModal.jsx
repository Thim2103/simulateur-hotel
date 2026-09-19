import { useState } from "react";
import GameModal from "../../components/GameModal";
import { HOUSEKEEPING_STAFF } from "../../../lib/housekeeping";
import { ROOM_STATE_STYLES } from "./schematicTokens";

// Deterministic (not random) so the same room always suggests the same
// housekeeper within one session -- a simple stand-in for a real
// assignment algorithm, built on the actual HOUSEKEEPING_STAFF roster
// housekeeping.js's own round-robin assignStaff() draws from (see that
// file's own docstring), since there is no per-room assignment field in
// the data model yet (see this file's own docstring below).
function suggestHousekeeper(roomNumber) {
  const code = String(roomNumber)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return HOUSEKEEPING_STAFF[code % HOUSEKEEPING_STAFF.length];
}

// The schematic view's own direct-action modal for a dirty/cleaning room
// (see directActions.js's own docstring for how this gets registered and
// opened). `entity` is the generic room entity EntityFactory.js produces
// -- `metadata.number` and `state` only, never a raw business `room`
// object.
//
// "Assigner" only ever *suggests* a housekeeper today: there is no
// per-room staff-assignment field anywhere in the data model yet (see
// lib/housekeeping.js's own `assignStaff()` -- a batch, round-robin
// operation over a task list, not something addressable by a single room
// id). "Lancer un nettoyage prioritaire" IS wired to a real, already-
// existing mechanism: `onPriorityClean` (passed down from
// SchematicHotelView/Dashboard.jsx) is the exact same `cleaningRoomIds`
// transient-highlight flow Dashboard.jsx's own housekeeping quick action
// already uses.
export default function HousekeepingQuickModal({ entity, onClose, onPriorityClean }) {
  const [assignedTo, setAssignedTo] = useState(null);
  const [priorityLaunched, setPriorityLaunched] = useState(false);
  const statusStyle = ROOM_STATE_STYLES[entity.state] || ROOM_STATE_STYLES.clean;

  const handleAssign = () => setAssignedTo(suggestHousekeeper(entity.metadata.number));
  const handlePriorityClean = () => {
    onPriorityClean?.(entity);
    setPriorityLaunched(true);
  };

  return (
    <GameModal open onClose={onClose} title={`Chambre ${entity.metadata.number}`} className="flex flex-col gap-4">
      <div data-testid="housekeeping-modal-status" className="flex items-center gap-2 text-sm text-slate-700">
        <span aria-hidden="true">{statusStyle.icon}</span>
        <span>
          Statut actuel : <strong>{statusStyle.label}</strong>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleAssign}
          disabled={!!assignedTo}
          className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Assigner un(e) gouvernant(e)
        </button>
        {assignedTo && (
          <p data-testid="housekeeping-modal-assigned" className="text-sm text-emerald-700">
            Assigné(e) à {assignedTo}.
          </p>
        )}

        <button
          type="button"
          onClick={handlePriorityClean}
          disabled={priorityLaunched}
          className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Lancer un nettoyage prioritaire
        </button>
        {priorityLaunched && (
          <p data-testid="housekeeping-modal-priority-launched" className="text-sm text-emerald-700">
            Nettoyage prioritaire lancé.
          </p>
        )}
      </div>
    </GameModal>
  );
}

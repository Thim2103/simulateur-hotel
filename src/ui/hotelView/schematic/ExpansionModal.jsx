import { useState } from "react";
import GameModal from "../../components/GameModal";
import MaintenanceLevelSelector from "./MaintenanceLevelSelector";
import { ROOM_DAILY_COST } from "../../../lib/maintenance/maintenanceCostEngine";
import { capitalOf, treasuryOf } from "../../../lib/finance/investmentFunding";
import {
  ROOM_KINDS,
  SLOTS_PER_FLOOR,
  MAX_NEW_FLOORS,
  CONSTRUCTION_DAYS,
  builtFloors,
  expansionRoomCount,
  floorConstructionStatus,
  floorUnderConstruction,
  fitOutStatus,
  freeSlots,
  nextFloorCost,
  nextFloorLevel,
  roomsOnFloor,
} from "../../../lib/expansion/hotelExpansionEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

const FLOOR_STATUS_TEXT = {
  "in-progress": "Un chantier est déjà en cours",
  max: `Le bâtiment a atteint sa hauteur maximale (${MAX_NEW_FLOORS} étages ajoutés)`,
  "no-funds": "Fonds insuffisants",
};

const FITOUT_STATUS_TEXT = { "floor-full": "Étage complet", "no-funds": "Fonds insuffisants" };

// The schematic view's expansion modal (see lib/expansion/hotelExpansionEngine.js):
// build the next floor of the building, then fit its rooms out. `bundle` is
// the hotel bundle ({ hotelState, rooms }) -- the funds, the floors and the
// rooms all come from it. `onStartFloor()` and `onFitOut(level, kind)` do the
// actual spending -- Dashboard.jsx wires them to startFloorConstruction() and
// fitOutRooms() through applyHotelAdjustment().
export default function ExpansionModal({ hotelState, rooms, day = 0, onStartFloor, onFitOut, onSetMaintenanceLevel, onClose }) {
  const [floorRequested, setFloorRequested] = useState(false);
  const bundle = { hotelState, rooms };
  const status = floorConstructionStatus(hotelState);
  const building = floorUnderConstruction(hotelState);
  const floors = builtFloors(hotelState);
  const treasury = treasuryOf(hotelState);
  const startable = status === "available" && !floorRequested;

  const handleStartFloor = () => {
    setFloorRequested(true);
    onStartFloor?.();
  };

  return (
    <GameModal open onClose={onClose} title="🏗️ Extension du bâtiment" className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span data-testid="expansion-capacity">
          Capacité : <strong>{(rooms || []).length} chambres</strong>
          {expansionRoomCount(rooms) > 0 && ` (dont ${expansionRoomCount(rooms)} issues de l'extension)`}
        </span>
        <span data-testid="expansion-funds">
          Capital disponible : <strong>{euro(capitalOf(hotelState))}</strong>
          {treasury > 0 && <span data-testid="expansion-treasury"> · Trésorerie : <strong>{euro(treasury)}</strong></span>}
        </span>
      </div>

      <section data-testid="expansion-new-floor" data-status={status} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-900">Nouvel étage{status === "max" ? "" : ` — étage ${nextFloorLevel(hotelState)}`}</p>
        {building && (
          <p data-testid="expansion-works" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            🏗️ Chantier en cours : étage {building.level} (gros œuvre terminé au jour {building.completesOnDay}). Le bruit pèse un peu sur la satisfaction des clients.
          </p>
        )}
        {status !== "max" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {euro(nextFloorCost(hotelState))} · {CONSTRUCTION_DAYS} j de gros œuvre · jusqu'à {SLOTS_PER_FLOOR} chambres
            </span>
            <button
              type="button"
              disabled={!startable}
              onClick={handleStartFloor}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lancer le gros œuvre
            </button>
          </div>
        )}
        {FLOOR_STATUS_TEXT[status] && (
          <p data-testid="expansion-floor-status" className="text-xs text-slate-500">
            {FLOOR_STATUS_TEXT[status]}
          </p>
        )}
      </section>

      {floors.length === 0 && <p className="text-xs text-slate-500">Une fois un étage construit, vous pourrez y aménager des chambres Standard, Deluxe ou Suite.</p>}

      {floors.map((floor) => (
        <section key={floor.level} data-testid={`expansion-floor-${floor.level}`} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Étage {floor.level} — {roomsOnFloor(rooms, floor.level).length}/{SLOTS_PER_FLOOR} chambres
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROOM_KINDS).map(([kind, spec]) => {
              const fitStatus = fitOutStatus(bundle, floor.level, kind);
              return (
                <button
                  key={kind}
                  type="button"
                  data-testid={`fitout-${floor.level}-${kind}`}
                  data-status={fitStatus}
                  disabled={fitStatus !== "available"}
                  title={FITOUT_STATUS_TEXT[fitStatus] || `Aménager une chambre ${spec.label}`}
                  onClick={() => onFitOut?.(floor.level, kind)}
                  className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
                >
                  + {spec.label} · {euro(spec.cost)} · {ROOM_DAILY_COST[kind]} €/j
                </button>
              );
            })}
          </div>
          {freeSlots(rooms, floor.level) === 0 && <p className="text-xs text-slate-500">Étage complet.</p>}
        </section>
      ))}

      {onSetMaintenanceLevel && <MaintenanceLevelSelector hotelState={hotelState} rooms={rooms} onChange={onSetMaintenanceLevel} />}

      <p className="text-xs text-slate-500">Jour {day}. Plus de chambres, c'est plus de clients possibles — mais aussi plus de ménage et de personnel à prévoir.</p>
    </GameModal>
  );
}

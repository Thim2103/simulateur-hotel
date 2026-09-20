import { LEVELS, CATEGORY_LABELS, WEAR_THRESHOLD, computeDailyMaintenance, hotelCondition, maintenanceLevel } from "../../../lib/maintenance/maintenanceCostEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

// What the day's bill would be at another level, for the level buttons.
function billAt(hotelState, rooms, level) {
  return computeDailyMaintenance({ hotelState: { ...hotelState, maintenance: { ...(hotelState?.maintenance || {}), level } }, rooms }).total;
}

function conditionTone(condition) {
  if (condition < WEAR_THRESHOLD) return "text-rose-700";
  if (condition >= 90) return "text-emerald-700";
  return "text-slate-700";
}

// The player's upkeep budget (see lib/maintenance/maintenanceCostEngine.js):
// what running the hotel costs per day, the hotel's condition, and the
// choice between Économique, Standard and Premium. `onChange(level)` is what
// actually changes the level -- Dashboard.jsx wires it to
// setMaintenanceLevel() through applyHotelAdjustment().
export default function MaintenanceLevelSelector({ hotelState, rooms, onChange }) {
  const current = maintenanceLevel(hotelState);
  const bill = computeDailyMaintenance({ hotelState, rooms });
  const condition = Math.round(hotelCondition(hotelState));

  return (
    <section data-testid="maintenance-selector" className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-900">🔧 Entretien & charges d'exploitation</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span data-testid="maintenance-bill">
          Charges : <strong>{euro(bill.total)} / jour</strong>
          {bill.total > 0 && (
            <span>
              {" "}
              ({Object.entries(CATEGORY_LABELS)
                .filter(([key]) => bill[key] > 0)
                .map(([key, label]) => `${label} ${euro(bill[key])}`)
                .join(" · ")})
            </span>
          )}
        </span>
        <span data-testid="maintenance-condition" className={conditionTone(condition)}>
          État de l'hôtel : <strong>{condition}/100</strong>
        </span>
      </div>
      {condition < WEAR_THRESHOLD && (
        <p data-testid="maintenance-warning" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          L'hôtel est en mauvais état : les clients le remarquent et des pannes d'usure surviennent. Passez en Premium pour le remettre à niveau.
        </p>
      )}
      <div role="radiogroup" aria-label="Niveau d'entretien" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Object.entries(LEVELS).map(([id, level]) => {
          const selected = id === current;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`maintenance-level-${id}`}
              onClick={() => !selected && onChange?.(id)}
              className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                selected ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="font-semibold">
                {level.label} · {euro(billAt(hotelState, rooms, id))}/j
              </span>
              <span className="text-[11px] leading-snug text-slate-600">{level.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

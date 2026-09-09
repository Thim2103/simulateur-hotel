import { toIso } from "./IsoGrid";

// Ground-floor block: restaurant.
export default function IsoRestaurant({ col, row }) {
  const { x, y } = toIso(col, row);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center border-2 border-slate-300 bg-white shadow-sm">
        <span aria-hidden="true" className="-rotate-45 text-sm">🍽️</span>
      </div>
      <span className="mt-1 block text-[10px] font-medium text-slate-600">Restaurant</span>
    </div>
  );
}

import { toIso } from "./IsoGrid";
import "./isoView.css";

// Ground-floor block: back-office (housekeeping/staff) -- pulses when
// `hasIncident` is true, same "surfaced on the hotel itself" idea as
// v2's BackOffice.jsx.
export default function IsoBackOffice({ col, row, hasIncident = false }) {
  const { x, y } = toIso(col, row);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center border-2 border-slate-300 bg-white shadow-sm">
        <span aria-hidden="true" className="-rotate-45 text-sm">🗂️</span>
      </div>
      <span className="mt-1 block text-[10px] font-medium text-slate-600">Back-office</span>
      {hasIncident && (
        <span aria-hidden="true" className="iso-pulse mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[9px] text-rose-600">
          ❗
        </span>
      )}
    </div>
  );
}

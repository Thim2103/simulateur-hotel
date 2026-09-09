import StaffIcon from "./StaffIcon";
import IncidentIcon from "./IncidentIcon";

// Ground-floor block: back-office (housekeeping/staff) -- shows an
// IncidentIcon when `hasIncident` is true, so a housekeeping/staff issue
// surfaced by AttentionPanel is visible on the hotel itself, not only in
// the text list below it.
export default function BackOffice({ hasIncident = false }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 px-3 py-3">
      <span aria-hidden="true" className="text-xl">🗂️</span>
      <span className="text-xs font-medium text-slate-600">Back-office</span>
      <div className="flex items-center gap-1">
        <StaffIcon />
        {hasIncident && <IncidentIcon />}
      </div>
    </div>
  );
}

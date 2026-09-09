import GuestIcon from "./GuestIcon";
import StaffIcon from "./StaffIcon";

// Ground-floor block: réception -- shows a couple of guests passing
// through and one staff member on duty. `guestCount` only controls how
// many GuestIcon glyphs render (capped) -- never a precise headcount.
export default function Reception({ guestCount = 0 }) {
  const visibleGuests = Math.min(3, guestCount);
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 px-3 py-3">
      <span aria-hidden="true" className="text-xl">🛎️</span>
      <span className="text-xs font-medium text-slate-600">Réception</span>
      <div className="flex items-center gap-1">
        <StaffIcon />
        {Array.from({ length: visibleGuests }, (_, index) => (
          <GuestIcon key={index} />
        ))}
      </div>
    </div>
  );
}

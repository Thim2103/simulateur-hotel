import StaffIcon from "./StaffIcon";

// Ground-floor block: restaurant.
export default function Restaurant() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 px-3 py-3">
      <span aria-hidden="true" className="text-xl">🍽️</span>
      <span className="text-xs font-medium text-slate-600">Restaurant</span>
      <StaffIcon />
    </div>
  );
}

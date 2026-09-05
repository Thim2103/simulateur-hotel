export default function PMSReservationBlock({
  reservation,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
}) {
  const colors = {
    confirmée: "bg-green-500",
    annulée: "bg-red-500",
    option: "bg-yellow-500",
    dirty: "bg-red-500",
    "in-progress": "bg-yellow-500",
    clean: "bg-green-500",
  };

  const label = reservation.client_name || reservation.client || "Guest";
  const status = String(reservation.status || "").toLowerCase();

  return (
    <div
      className={`absolute inset-0 ${colors[status] || colors[reservation.status] || "bg-blue-500"} flex cursor-pointer items-center justify-center rounded text-center text-[10px] font-medium text-white`}
      title={`${label} • ${reservation.arrival} → ${reservation.departure}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {label}
    </div>
  );
}

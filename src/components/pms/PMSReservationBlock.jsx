export default function PMSReservationBlock({
  reservation,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onResizeStart,
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
      {onResizeStart && (
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20"
          draggable
          title="Drag to adjust departure date"
          onDragStart={(event) => { event.stopPropagation(); onResizeStart(); }}
          onDragEnd={(event) => { event.stopPropagation(); onDragEnd?.(); }}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}

export default function PMSReservationBlock({ reservation }) {
  const colors = {
    confirmée: "bg-green-500",
    annulée: "bg-red-500",
    option: "bg-yellow-500",
  };

  return (
    <div
      className={`absolute inset-0 ${colors[reservation.status] || "bg-blue-500"} 
      text-white text-xs flex items-center justify-center rounded`}
      title={`${reservation.client_name} • ${reservation.arrival} → ${reservation.departure}`}
    >
      {reservation.client_name}
    </div>
  );
}

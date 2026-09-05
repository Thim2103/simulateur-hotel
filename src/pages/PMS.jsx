import { useEffect, useState } from "react";
import { getRooms, getReservations } from "../lib/calculs/rm";
import PMSGrid from "../components/pms/PMSGrid";
import PMSFilters from "../components/pms/PMSFilters";
import PMSLegend from "../components/pms/PMSLegend";
import PMSReservationEditor from "../components/pms/PMSReservationEditor";
import PMSHousekeepingPanel from "../components/pms/PMSHousekeepingPanel";
import PMSSchedulingPanel from "../components/pms/PMSSchedulingPanel";

export default function PMS() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    roomType: "",
    status: "",
  });

  useEffect(() => {
    async function load() {
      const r = await getRooms();
      const res = await getReservations();

      setRooms(Array.isArray(r) ? r : []);
      setReservations(Array.isArray(res) ? res : []);
      setSelectedReservation((previous) => previous ?? (Array.isArray(res) ? res[0] : null));
      setLoading(false);
    }

    load();
  }, []);

  const handleReservationMove = (updatedReservation) => {
    setReservations((current) =>
      current.map((reservation) => (Number(reservation.id) === Number(updatedReservation.id) ? updatedReservation : reservation))
    );
    setSelectedReservation(updatedReservation);
  };

  const handleSaveReservation = (updatedReservation) => {
    setReservations((current) =>
      current.map((reservation) => (Number(reservation.id) === Number(updatedReservation.id) ? updatedReservation : reservation))
    );
    setSelectedReservation(updatedReservation);
  };

  if (loading) return <div className="p-6">Chargement du planning…</div>;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Property management system</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Planning PMS</h1>
          <p className="mt-1 text-sm text-slate-500">Visualisez les disponibilités et les réservations sur les 14 prochains jours.</p>
        </div>
      </header>

      <PMSFilters filters={filters} setFilters={setFilters} />

      <PMSLegend />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <PMSGrid
            rooms={rooms}
            reservations={reservations}
            filters={filters}
            onReservationMove={handleReservationMove}
            onSelectReservation={setSelectedReservation}
          />
        </div>

        <div className="space-y-6">
          <PMSHousekeepingPanel />
          <PMSSchedulingPanel />
          <PMSReservationEditor reservation={selectedReservation} rooms={rooms} onSave={handleSaveReservation} />
        </div>
      </div>
    </div>
  );
}

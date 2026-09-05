import { useEffect, useState } from "react";
import { getRooms, getReservations, occupationRate } from "../lib/calculs/rm";
import { updateReservation } from "../lib/restaurantRepository";
import PMSGrid from "../components/pms/PMSGrid";
import PMSFilters from "../components/pms/PMSFilters";
import PMSLegend from "../components/pms/PMSLegend";
import PMSReservationEditor from "../components/pms/PMSReservationEditor";
import PMSHousekeepingPanel from "../components/pms/PMSHousekeepingPanel";
import PMSSchedulingPanel from "../components/pms/PMSSchedulingPanel";
import { publishPmsEvent } from "../lib/pmsRestaurantBridge";

export default function PMS() {
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    roomType: "",
    status: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [r, res] = await Promise.all([getRooms(), getReservations()]);
        setRooms(Array.isArray(r) ? r : []);
        setReservations(Array.isArray(res) ? res : []);
        setSelectedReservation((previous) => previous ?? (Array.isArray(res) ? res[0] : null));
        publishPmsEvent("reservation.synced", {
          reservations: Array.isArray(res) ? res : [],
          occupancy: occupationRate(Array.isArray(r) ? r : [], Array.isArray(res) ? res : []),
        });
        setError(null);
      } catch (loadError) {
        setError(loadError);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const saveReservation = async (updatedReservation) => {
    try {
      const savedReservation = await updateReservation(updatedReservation.id, updatedReservation);
      setReservations((current) =>
        current.map((reservation) => (Number(reservation.id) === Number(savedReservation.id) ? savedReservation : reservation))
      );
      setSelectedReservation(savedReservation);
      setError(null);
      publishPmsEvent("reservation.updated", { reservation: savedReservation });
    } catch (saveError) {
      setError(saveError);
    }
  };

  const handleHousekeepingStatus = ({ task, summary }) => {
    publishPmsEvent("housekeeping.updated", { ...summary, status: task?.status, room: task?.room });
  };

  const handleSchedulingVisible = (events) => {
    publishPmsEvent("scheduling.synced", { count: events.length, events });
  };

  if (loading) return <div className="p-6">Chargement du planning…</div>;
  if (error) return <div className="p-6 text-red-600">Erreur de chargement du planning : {error.message}</div>;

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
            onReservationMove={saveReservation}
            onSelectReservation={setSelectedReservation}
          />
        </div>

        <div className="space-y-6">
          <PMSHousekeepingPanel onStatusChange={handleHousekeepingStatus} />
          <PMSSchedulingPanel onEventsVisible={handleSchedulingVisible} />
          <PMSReservationEditor reservation={selectedReservation} rooms={rooms} onSave={saveReservation} />
        </div>
      </div>
    </div>
  );
}

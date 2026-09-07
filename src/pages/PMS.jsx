import { useEffect, useState } from "react";
import { getRooms, getReservations, occupationRate } from "../lib/calculs/rm";
import { saveReservation, saveRoom } from "../lib/pmsRepository";
import { applyTurnover, turnedOverRooms } from "../lib/housekeeping";
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
  const [conflictNotice, setConflictNotice] = useState(null);

  const [filters, setFilters] = useState({
    roomType: "",
    status: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [r, res] = await Promise.all([getRooms(), getReservations()]);
        const loadedRooms = Array.isArray(r) ? r : [];
        const loadedReservations = Array.isArray(res) ? res : [];

        const roomsAfterTurnover = applyTurnover(loadedRooms, loadedReservations);
        const changedRooms = turnedOverRooms(loadedRooms, roomsAfterTurnover);
        if (changedRooms.length) {
          await Promise.all(changedRooms.map((room) => saveRoom(room)));
          publishPmsEvent("housekeeping.turnover", { rooms: changedRooms });
        }

        setRooms(roomsAfterTurnover);
        setReservations(loadedReservations);
        setSelectedReservation((previous) => previous ?? loadedReservations[0] ?? null);
        publishPmsEvent("reservation.synced", {
          reservations: loadedReservations,
          occupancy: occupationRate(roomsAfterTurnover, loadedReservations),
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

  const persistReservation = async (updatedReservation) => {
    try {
      const savedReservation = await saveReservation(updatedReservation);
      setReservations((current) =>
        current.map((reservation) => (Number(reservation.id) === Number(savedReservation.id) ? savedReservation : reservation))
      );
      setSelectedReservation(savedReservation);
      setConflictNotice(null);
      setError(null);
      publishPmsEvent("reservation.updated", { reservation: savedReservation });
    } catch (saveError) {
      setError(saveError);
    }
  };

  const handleReservationConflict = ({ reservation, conflicts }) => {
    setConflictNotice(`Impossible de déplacer la réservation de ${reservation.client_name} : chevauchement avec ${conflicts[0].client_name}.`);
  };

  const handleHousekeepingStatus = async ({ roomId, status, task }) => {
    const room = rooms.find((item) => Number(item.id) === Number(roomId));
    if (!room) return;
    try {
      const savedRoom = await saveRoom({ ...room, housekeeping_status: status });
      setRooms((current) => current.map((item) => (Number(item.id) === Number(savedRoom.id) ? savedRoom : item)));
      publishPmsEvent("housekeeping.updated", { room: savedRoom, status, task: task?.task });
    } catch (statusError) {
      setError(statusError);
    }
  };

  const handleSchedulingVisible = (events) => {
    publishPmsEvent("scheduling.synced", { count: events.length, events });
  };

  if (loading) return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><span className="inline-flex items-center gap-2" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-700" />Chargement du planning…</span></div>;
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Erreur de chargement du planning : {error.message}</div>;

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

      {conflictNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{conflictNotice}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <PMSGrid
            rooms={rooms}
            reservations={reservations}
            filters={filters}
            onReservationMove={persistReservation}
            onReservationConflict={handleReservationConflict}
            onSelectReservation={setSelectedReservation}
          />
        </div>

        <div className="space-y-6">
          <PMSHousekeepingPanel rooms={rooms} reservations={reservations} onStatusChange={handleHousekeepingStatus} />
          <PMSSchedulingPanel rooms={rooms} onEventsVisible={handleSchedulingVisible} />
          <PMSReservationEditor reservation={selectedReservation} rooms={rooms} onSave={persistReservation} />
        </div>
      </div>
    </div>
  );
}

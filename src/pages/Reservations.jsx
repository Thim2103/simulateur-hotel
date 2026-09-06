import { useEffect, useState } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ReservationForm from "../components/pms/ReservationForm";
import { deleteReservation, listReservations, listRooms, saveReservation } from "../lib/pmsRepository";

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [editingReservation, setEditingReservation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reservationRows, roomRows] = await Promise.all([listReservations(), listRooms()]);
      setReservations(reservationRows);
      setRooms(roomRows);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (reservation) => {
    try {
      await saveReservation(reservation);
      setEditingReservation(null);
      setShowForm(false);
      await fetchData();
    } catch (saveError) {
      setError(saveError);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteReservation(id);
      await fetchData();
    } catch (deleteError) {
      setError(deleteError);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <p className="eyebrow">Hébergement</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Réservations</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez les séjours, les sources de réservation et les statuts.</p>
        </div>
        <Button onClick={() => { setEditingReservation(null); setShowForm(true); }}>Nouvelle réservation</Button>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      {showForm && <ReservationForm reservation={editingReservation} rooms={rooms} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <Table columns={["Client", "Chambre", "Arrivée", "Départ", "Source", "Statut", "Actions"]} loading={loading} error={error ? error.message : ""} empty={reservations.length === 0} emptyMessage="Aucune réservation n'est disponible pour le moment.">
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <td className="max-w-[220px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={reservation.client_name}>{reservation.client_name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{reservation.room || reservation.room_id}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{reservation.arrival}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{reservation.departure}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{reservation.source}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge type={reservation.status === "confirmée" ? "success" : reservation.status === "annulée" ? "danger" : "warning"}>
                  {reservation.status}
                </Badge>
              </td>
              <td className="px-4 py-3"><div className="flex min-w-max gap-2">
                <Button variant="secondary" onClick={() => { setEditingReservation(reservation); setShowForm(true); }}>Modifier</Button>
                <Button variant="danger" onClick={() => handleDelete(reservation.id)}>Supprimer</Button>
              </div>
              </td>
            </TableRow>
          ))}
        </Table>
    </div>
  );
}

import { useEffect, useState } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import RoomForm from "../components/pms/RoomForm";
import { deleteRoom, listRooms, saveRoom } from "../lib/pmsRepository";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchRooms() {
    setLoading(true); setError(null);
    try { setRooms(await listRooms()); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }
  async function handleSave(room) {
    try { await saveRoom(room); setEditingRoom(null); setShowForm(false); await fetchRooms(); }
    catch (saveError) { setError(saveError); }
  }
  async function handleDelete(id) {
    try { await deleteRoom(id); await fetchRooms(); }
    catch (deleteError) { setError(deleteError); }
  }
  useEffect(() => { fetchRooms(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header"><div><p className="eyebrow">Hébergement</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Chambres</h1><p className="mt-1 text-sm text-slate-500">Gérez l'inventaire, les tarifs et la disponibilité des chambres.</p></div><Button onClick={() => { setEditingRoom(null); setShowForm(true); }}>Ajouter une chambre</Button></header>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error.message || "Une erreur est survenue."}</p>}
      {showForm && <RoomForm room={editingRoom} onSave={handleSave} onCancel={() => setShowForm(false)} />}
      <Table columns={["Numéro", "Type", "Prix", "Statut", "Housekeeping", "Actions"]} loading={loading} error={error ? error.message : ""} empty={rooms.length === 0} emptyMessage="Aucune chambre n'est disponible pour le moment.">
        {rooms.map((room) => <TableRow key={room.id}><td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{room.number}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{room.type}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{room.price} €</td><td className="whitespace-nowrap px-4 py-3"><Badge type={room.status === "libre" ? "success" : room.status === "occupée" ? "danger" : "warning"}>{room.status}</Badge></td><td className="whitespace-nowrap px-4 py-3"><Badge type={room.housekeeping_status === "clean" ? "success" : "warning"}>{room.housekeeping_status}</Badge></td><td className="px-4 py-3"><div className="flex min-w-max gap-2"><Button variant="secondary" onClick={() => { setEditingRoom(room); setShowForm(true); }}>Modifier</Button><Button variant="danger" onClick={() => handleDelete(room.id)}>Supprimer</Button></div></td></TableRow>)}
      </Table>
    </div>
  );
}

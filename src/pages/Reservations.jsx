import { useState, useEffect } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { createReservation, deleteReservation as removeReservation, listReservations, updateReservation as saveReservation } from "../lib/restaurantRepository";

export default function Reservations() {
  const [reservations, setReservations] = useState([]);

  // Charger les réservations depuis Supabase
  async function fetchReservations() {
    try {
      setReservations(await listReservations());
    } catch (error) {
      console.error("Erreur fetchReservations :", error);
    }
  }

  // ➕ Ajouter une réservation
  async function addReservation() {
    const newRes = {
      client_name: prompt("Nom du client :"),
      room: prompt("Chambre :"),
      arrival: prompt("Date d'arrivée (YYYY-MM-DD) :"),
      departure: prompt("Date de départ (YYYY-MM-DD) :"),
      status: "en attente",
    };

    try { await createReservation(newRes); fetchReservations(); }
    catch (error) { console.error("Erreur addReservation :", error); }
  }

  // ✏️ Modifier une réservation
  async function updateReservation(id) {
    const res = reservations.find((r) => r.id === id);

    const updated = {
      client_name: prompt("Nom du client :", res.client_name || res.client),
      room: prompt("Chambre :", res.room),
      arrival: prompt("Arrivée :", res.arrival),
      departure: prompt("Départ :", res.departure),
      status: prompt("Statut (confirmée, annulée, en attente) :", res.status),
    };

    try { await saveReservation(id, updated); fetchReservations(); }
    catch (error) { console.error("Erreur updateReservation :", error); }
  }

  // ❌ Supprimer une réservation
  async function deleteReservation(id) {
    try { await removeReservation(id); fetchReservations(); }
    catch (error) { console.error("Erreur deleteReservation :", error); }
  }

  // Charger les réservations au montage
  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Réservations</h1>
        <Button onClick={addReservation}>Nouvelle réservation</Button>
      </div>

      {/* Table */}
      <Table columns={["Client", "Chambre", "Arrivée", "Départ", "Statut", "Actions"]}>
        {reservations.map((res) => (
          <TableRow key={res.id}>
            <td className="px-4 py-2">{res.client_name || res.client}</td>
            <td className="px-4 py-2">{res.room}</td>
            <td className="px-4 py-2">{res.arrival}</td>
            <td className="px-4 py-2">{res.departure}</td>

            <td className="px-4 py-2">
              <Badge
                type={
                  res.status === "confirmée"
                    ? "success"
                    : res.status === "annulée"
                    ? "danger"
                    : "warning"
                }
              >
                {res.status}
              </Badge>
            </td>

            {/* Actions */}
            <td className="px-4 py-2 flex gap-2">
              <Button variant="secondary" onClick={() => updateReservation(res.id)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => deleteReservation(res.id)}>
                Supprimer
              </Button>
            </td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}

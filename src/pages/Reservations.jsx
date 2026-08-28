import { useState, useEffect } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

export default function Reservations() {
  const [reservations, setReservations] = useState([]);

  // Charger les réservations depuis Supabase
  async function fetchReservations() {
    const { data, error } = await supabase.from("reservations").select("*");

    if (error) {
      console.error("Erreur fetchReservations :", error);
      return;
    }

    setReservations(data);
  }

  // ➕ Ajouter une réservation
  async function addReservation() {
    const newRes = {
      client: prompt("Nom du client :"),
      room: prompt("Chambre :"),
      arrival: prompt("Date d'arrivée (YYYY-MM-DD) :"),
      departure: prompt("Date de départ (YYYY-MM-DD) :"),
      status: "en attente",
    };

    const { error } = await supabase.from("reservations").insert([newRes]);

    if (error) {
      console.error("Erreur addReservation :", error);
      return;
    }

    fetchReservations();
  }

  // ✏️ Modifier une réservation
  async function updateReservation(id) {
    const res = reservations.find((r) => r.id === id);

    const updated = {
      client: prompt("Nom du client :", res.client),
      room: prompt("Chambre :", res.room),
      arrival: prompt("Arrivée :", res.arrival),
      departure: prompt("Départ :", res.departure),
      status: prompt("Statut (confirmée, annulée, en attente) :", res.status),
    };

    const { error } = await supabase
      .from("reservations")
      .update(updated)
      .eq("id", id);

    if (error) {
      console.error("Erreur updateReservation :", error);
      return;
    }

    fetchReservations();
  }

  // ❌ Supprimer une réservation
  async function deleteReservation(id) {
    const { error } = await supabase.from("reservations").delete().eq("id", id);

    if (error) {
      console.error("Erreur deleteReservation :", error);
      return;
    }

    fetchReservations();
  }

  // Charger les réservations au montage
  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Réservations</h1>
        <Button onClick={addReservation}>Nouvelle réservation</Button>
      </div>

      {/* Table */}
      <Table columns={["Client", "Chambre", "Arrivée", "Départ", "Statut", "Actions"]}>
        {reservations.map((res) => (
          <TableRow key={res.id}>
            <td className="px-4 py-2">{res.client}</td>
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

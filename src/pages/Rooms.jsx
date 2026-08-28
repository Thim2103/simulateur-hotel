import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);

  // Charger les chambres depuis Supabase
  async function fetchRooms() {
    const { data, error } = await supabase.from("rooms").select("*");

    if (error) {
      console.error("Erreur fetchRooms :", error);
      return;
    }

    setRooms(data);
  }

  // Ajouter une chambre
  async function addRoom() {
    const newRoom = {
      number: prompt("Numéro de chambre :"),
      type: prompt("Type (Standard, Deluxe, Suite) :"),
      price: Number(prompt("Prix :")),
      status: "libre",
    };

    const { error } = await supabase.from("rooms").insert([newRoom]);

    if (error) {
      console.error("Erreur addRoom :", error);
      return;
    }

    fetchRooms();
  }

  // Supprimer une chambre
  async function deleteRoom(id) {
    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) {
      console.error("Erreur deleteRoom :", error);
      return;
    }

    fetchRooms();
  }

  // Modifier une chambre
  async function updateRoom(id) {
    const room = rooms.find((r) => r.id === id);

    const updated = {
      number: prompt("Numéro :", room.number),
      type: prompt("Type :", room.type),
      price: Number(prompt("Prix :", room.price)),
      status: prompt("Statut (libre, occupée, maintenance) :", room.status),
    };

    const { error } = await supabase
      .from("rooms")
      .update(updated)
      .eq("id", id);

    if (error) {
      console.error("Erreur updateRoom :", error);
      return;
    }

    fetchRooms();
  }

  // Charger les chambres au montage
  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chambres</h1>
        <Button onClick={addRoom}>Ajouter une chambre</Button>
      </div>

      {/* Table */}
      <Table columns={["Numéro", "Type", "Prix", "Statut", "Actions"]}>
        {rooms.map((room) => (
          <TableRow key={room.id}>
            <td className="px-4 py-2">{room.number}</td>
            <td className="px-4 py-2">{room.type}</td>
            <td className="px-4 py-2">{room.price} €</td>
            <td className="px-4 py-2">
              <Badge
                type={
                  room.status === "libre"
                    ? "success"
                    : room.status === "occupée"
                    ? "danger"
                    : "warning"
                }
              >
                {room.status}
              </Badge>
            </td>

            {/* Actions */}
            <td className="px-4 py-2 flex gap-2">
              <Button variant="secondary" onClick={() => updateRoom(room.id)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => deleteRoom(room.id)}>
                Supprimer
              </Button>
            </td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}

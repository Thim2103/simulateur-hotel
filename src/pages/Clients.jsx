import { useState, useEffect } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

export default function Clients() {
  const [clients, setClients] = useState([]);

  // Charger les clients depuis Supabase
  async function fetchClients() {
    const { data, error } = await supabase.from("clients").select("*");

    if (error) {
      console.error("Erreur fetchClients :", error);
      return;
    }

    setClients(data);
  }

  // Ajouter un client
  async function addClient() {
    const newClient = {
      name: prompt("Nom du client :"),
      email: prompt("Email :"),
      phone: prompt("Téléphone :"),
      segment: prompt("Segment (Loisirs, Corporate, OTA) :"),
    };

    const { error } = await supabase.from("clients").insert([newClient]);

    if (error) {
      console.error("Erreur addClient :", error);
      return;
    }

    fetchClients();
  }

  // Modifier un client
  async function updateClient(id) {
    const client = clients.find((c) => c.id === id);

    const updated = {
      name: prompt("Nom :", client.name),
      email: prompt("Email :", client.email),
      phone: prompt("Téléphone :", client.phone),
      segment: prompt("Segment :", client.segment),
    };

    const { error } = await supabase
      .from("clients")
      .update(updated)
      .eq("id", id);

    if (error) {
      console.error("Erreur updateClient :", error);
      return;
    }

    fetchClients();
  }

  // Supprimer un client
  async function deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      console.error("Erreur deleteClient :", error);
      return;
    }

    fetchClients();
  }

  // Charger les clients au montage
  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button onClick={addClient}>Ajouter un client</Button>
      </div>

      {/* Table */}
      <Table columns={["Nom", "Email", "Téléphone", "Segment", "Actions"]}>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <td className="px-4 py-2">{client.name}</td>
            <td className="px-4 py-2">{client.email}</td>
            <td className="px-4 py-2">{client.phone}</td>
            <td className="px-4 py-2">
              <Badge
                type={
                  client.segment === "Corporate"
                    ? "info"
                    : client.segment === "Loisirs"
                    ? "success"
                    : "warning"
                }
              >
                {client.segment}
              </Badge>
            </td>

            {/* Actions */}
            <td className="px-4 py-2 flex gap-2">
              <Button variant="secondary" onClick={() => updateClient(client.id)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => deleteClient(client.id)}>
                Supprimer
              </Button>
            </td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}

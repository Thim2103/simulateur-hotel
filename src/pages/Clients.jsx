import { useEffect, useState } from "react";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { deleteClient, listClients, saveClient } from "../lib/pmsRepository";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  async function fetchClients() { setLoading(true); setError(null); try { setClients(await listClients()); } catch (loadError) { setError(loadError); } finally { setLoading(false); } }
  async function addClient() { try { await saveClient({ name: prompt("Nom du client :"), email: prompt("Email :"), phone: prompt("Téléphone :"), segment: prompt("Segment (Loisirs, Corporate, OTA) :") }); await fetchClients(); } catch (saveError) { setError(saveError); } }
  async function updateClient(id) { const client = clients.find((item) => item.id === id); try { await saveClient({ ...client, name: prompt("Nom :", client.name), email: prompt("Email :", client.email), phone: prompt("Téléphone :", client.phone), segment: prompt("Segment :", client.segment) }); await fetchClients(); } catch (saveError) { setError(saveError); } }
  async function handleDelete(id) { try { await deleteClient(id); await fetchClients(); } catch (deleteError) { setError(deleteError); } }
  useEffect(() => { fetchClients(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header"><div><p className="eyebrow">Relation client</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clients</h1><p className="mt-1 text-sm text-slate-500">Centralisez les profils et segments de votre clientèle.</p></div><Button onClick={addClient}>Ajouter un client</Button></header>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error.message || "Une erreur est survenue."}</p>}
      <Table columns={["Nom", "Email", "Téléphone", "Segment", "Actions"]} loading={loading} error={error ? error.message : ""} empty={clients.length === 0} emptyMessage="Aucun client n'est disponible pour le moment.">
        {clients.map((client) => <TableRow key={client.id}><td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{client.name}</td><td className="max-w-[240px] truncate px-4 py-3 text-sm text-slate-600" title={client.email}>{client.email}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{client.phone}</td><td className="whitespace-nowrap px-4 py-3"><Badge type={client.segment === "Corporate" ? "info" : client.segment === "Loisirs" ? "success" : "warning"}>{client.segment}</Badge></td><td className="px-4 py-3"><div className="flex min-w-max gap-2"><Button variant="secondary" onClick={() => updateClient(client.id)}>Modifier</Button><Button variant="danger" onClick={() => handleDelete(client.id)}>Supprimer</Button></div></td></TableRow>)}
      </Table>
    </div>
  );
}

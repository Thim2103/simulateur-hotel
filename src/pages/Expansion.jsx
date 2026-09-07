import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import KpiCard from "../components/charts/KpiCard";
import { useHotelSimulator } from "../hooks/useHotelSimulator";

export default function Expansion() {
  const { expansion, kpis, updateExpansion, updateEstablishment, addEstablishment, removeEstablishment } = useHotelSimulator();

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Développement du réseau</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Expansion</h1>
          <p className="mt-1 text-sm text-slate-500">Pilotez l'ouverture et la mutualisation des établissements.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Établissements actifs" value={`${kpis.activeEstablishments}`} trend={0} />
        <KpiCard label="Chambres réseau (agrégé)" value={`${kpis.aggregateRoomCount}`} trend={4.2} />
        <KpiCard label="Capital disponible" value={`${Number(expansion.availableCapital).toLocaleString()} €`} trend={1.4} />
        <KpiCard label="Revenu réseau agrégé" value={`${kpis.aggregateRevenue.toLocaleString()} €`} trend={2.6} />
        <KpiCard label="Mutualisation du personnel" value={`${kpis.sharedStaffPoolUtilization}%`} trend={1.1} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold text-slate-900">Réseau d'établissements</h2><Button onClick={addEstablishment}>Ajouter un établissement</Button></div>
        <div className="space-y-4">
          {expansion.establishments.map((establishment) => (
            <div key={establishment.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-slate-200 p-4 transition-colors duration-150 hover:border-slate-300 md:grid-cols-7">
              <Input label="Nom" value={establishment.name} onChange={(event) => updateEstablishment(establishment.id, { name: event.target.value })} />
              <Input label="Ville" value={establishment.city} onChange={(event) => updateEstablishment(establishment.id, { city: event.target.value })} />
              <Input label="Chambres" type="number" min="1" value={establishment.roomCount} onChange={(event) => updateEstablishment(establishment.id, { roomCount: Number(event.target.value || 0) })} />
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Statut<select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" value={establishment.status} onChange={(event) => updateEstablishment(establishment.id, { status: event.target.value })}><option value="active">Actif</option><option value="planned">Planifié</option><option value="paused">En pause</option></select></label>
              <Input label="Responsable" value={establishment.manager} onChange={(event) => updateEstablishment(establishment.id, { manager: event.target.value })} />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={establishment.sharedStaffPool} onChange={(event) => updateEstablishment(establishment.id, { sharedStaffPool: event.target.checked })} className="accent-cyan-700" />Personnel mutualisé</label>
              <Button type="button" variant="danger" disabled={expansion.establishments.length === 1} onClick={() => removeEstablishment(establishment.id)}>Supprimer</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Règles de décision">
        <div className="mb-3 max-w-sm"><Input label="Capital disponible" type="number" min="0" value={expansion.availableCapital} onChange={(event) => updateExpansion({ availableCapital: Number(event.target.value || 0) })} /></div>
        <p className="text-sm text-slate-600">Un établissement planifié n'augmente pas la demande ni le revenu réseau avant son activation. Le personnel mutualisé réduit les coûts globaux mais augmente la dépendance entre sites.</p>
      </Card>
    </div>
  );
}

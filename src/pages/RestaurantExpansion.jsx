import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantExpansion() {
  const { expansion, kpis, updateExpansion, updateEstablishment, addEstablishment, removeEstablishment } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Établissements actifs" value={`${kpis.activeEstablishments}`} trend={0} />
        <KpiCard label="Capacité réseau" value={`${expansion.establishments.reduce((sum, item) => sum + Number(item.capacity || 0), 0)} places`} trend={4.2} />
        <KpiCard label="Capital disponible" value={`${Number(expansion.availableCapital).toLocaleString()} €`} trend={1.4} />
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Réseau d'établissements</h2><Button onClick={addEstablishment}>Ajouter un établissement</Button></div>
        <div className="space-y-4">
          {expansion.establishments.map((establishment) => (
            <div key={establishment.id} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <label className="flex flex-col gap-1 text-sm">Nom<input className="border rounded-md px-2 py-2" value={establishment.name} onChange={(event) => updateEstablishment(establishment.id, { name: event.target.value })} /></label>
              <label className="flex flex-col gap-1 text-sm">Ville<input className="border rounded-md px-2 py-2" value={establishment.city} onChange={(event) => updateEstablishment(establishment.id, { city: event.target.value })} /></label>
              <label className="flex flex-col gap-1 text-sm">Capacité<input type="number" min="1" className="border rounded-md px-2 py-2" value={establishment.capacity} onChange={(event) => updateEstablishment(establishment.id, { capacity: Number(event.target.value || 0) })} /></label>
              <label className="flex flex-col gap-1 text-sm">Statut<select className="border rounded-md px-2 py-2" value={establishment.status} onChange={(event) => updateEstablishment(establishment.id, { status: event.target.value })}><option value="active">Actif</option><option value="planned">Planifié</option><option value="paused">En pause</option></select></label>
              <label className="flex flex-col gap-1 text-sm">Responsable<input className="border rounded-md px-2 py-2" value={establishment.manager} onChange={(event) => updateEstablishment(establishment.id, { manager: event.target.value })} /></label>
              <button type="button" disabled={expansion.establishments.length === 1} className="bg-red-500 disabled:bg-gray-300 text-white rounded-md px-3 py-2" onClick={() => removeEstablishment(establishment.id)}>Supprimer</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold mb-3">Règles de décision</h2>
        <label className="flex flex-col gap-1 max-w-sm mb-3"><span className="font-medium">Capital disponible</span><input type="number" min="0" className="border rounded-md px-3 py-2" value={expansion.availableCapital} onChange={(event) => updateExpansion({ availableCapital: Number(event.target.value || 0) })} /></label>
        <p className="text-gray-600">Un établissement planifié n'augmente pas la demande avant son activation. Chaque site actif contribue à la capacité du réseau et aux coûts de simulation.</p>
      </section>
    </div>
  );
}

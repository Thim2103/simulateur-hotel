import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantMarketing() {
  const {
    marketing,
    kpis,
    updateMarketing,
    updateMarketingChannel,
    addMarketingCampaign,
    updateMarketingCampaign,
    removeMarketingCampaign,
  } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Portée estimée" value={`${kpis.marketingReach}%`} trend={2.4} />
        <KpiCard label="Budget mensuel" value={`${Number(marketing.budget).toLocaleString()} €`} trend={1.2} />
        <KpiCard label="Demande générée" value={`${kpis.demand}%`} trend={3.1} />
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold mb-4">Positionnement et budget</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Promesse client</span>
            <input className="border rounded-md px-3 py-2" value={marketing.positioning} onChange={(event) => updateMarketing({ positioning: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Budget mensuel</span>
            <input type="number" min="0" className="border rounded-md px-3 py-2" value={marketing.budget} onChange={(event) => updateMarketing({ budget: Number(event.target.value || 0) })} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold mb-4">Canaux d'acquisition</h2>
        <div className="space-y-3">
          {marketing.channels.map((channel) => (
            <div key={channel.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={channel.enabled} onChange={(event) => updateMarketingChannel(channel.id, { enabled: event.target.checked })} />{channel.name}</label>
              <label className="flex flex-col gap-1 text-sm">Budget<input type="number" min="0" className="border rounded-md px-2 py-1" value={channel.budget} onChange={(event) => updateMarketingChannel(channel.id, { budget: Number(event.target.value || 0) })} /></label>
              <label className="flex flex-col gap-1 text-sm">Portée<input type="number" min="0" max="100" className="border rounded-md px-2 py-1" value={channel.reach} onChange={(event) => updateMarketingChannel(channel.id, { reach: Number(event.target.value || 0) })} /></label>
              <div className="text-sm text-gray-600">{channel.enabled ? "Actif" : "En pause"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Campagnes</h2><Button onClick={addMarketingCampaign}>Ajouter</Button></div>
        <div className="space-y-3">
          {marketing.campaigns.map((campaign) => (
            <div key={campaign.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <input className="border rounded-md px-2 py-1" value={campaign.name} onChange={(event) => updateMarketingCampaign(campaign.id, { name: event.target.value })} />
              <select className="border rounded-md px-2 py-1" value={campaign.objective} onChange={(event) => updateMarketingCampaign(campaign.id, { objective: event.target.value })}><option>Acquisition</option><option>Fidélisation</option><option>Notoriété</option></select>
              <select className="border rounded-md px-2 py-1" value={campaign.status} onChange={(event) => updateMarketingCampaign(campaign.id, { status: event.target.value })}><option value="draft">Brouillon</option><option value="active">Active</option><option value="paused">En pause</option></select>
              <input type="number" min="0" className="border rounded-md px-2 py-1" value={campaign.budget} onChange={(event) => updateMarketingCampaign(campaign.id, { budget: Number(event.target.value || 0) })} />
              <input type="number" min="0" max="100" className="border rounded-md px-2 py-1" value={campaign.conversion} onChange={(event) => updateMarketingCampaign(campaign.id, { conversion: Number(event.target.value || 0) })} />
              <button type="button" className="bg-red-500 text-white rounded-md px-3 py-2" onClick={() => removeMarketingCampaign(campaign.id)}>Supprimer</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

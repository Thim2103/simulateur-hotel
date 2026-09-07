import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import KpiCard from "../components/charts/KpiCard";
import { useHotelSimulator } from "../hooks/useHotelSimulator";

export default function Marketing() {
  const {
    marketing,
    kpis,
    updateMarketing,
    updateMarketingChannel,
    addMarketingCampaign,
    updateMarketingCampaign,
    removeMarketingCampaign,
  } = useHotelSimulator();

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Acquisition &amp; fidélisation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez la portée, le budget et le retour sur investissement des campagnes.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Portée estimée" value={`${kpis.marketingReach}%`} trend={2.4} />
        <KpiCard label="Budget mensuel" value={`${Number(marketing.budget).toLocaleString()} €`} trend={1.2} />
        <KpiCard label="Demande hôtel" value={`${kpis.demand}%`} trend={3.1} />
        <KpiCard label="ROI moyen" value={`${kpis.marketingRoi.toFixed(2)}x`} trend={kpis.marketingRoi >= 1 ? 2.6 : -1.8} />
        <KpiCard label="Uplift de demande" value={`${kpis.marketingDemandUplift.toFixed(1)}%`} trend={1.9} />
      </div>

      <Card title="Positionnement et budget">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Promesse client" value={marketing.positioning} onChange={(event) => updateMarketing({ positioning: event.target.value })} />
          <Input label="Budget mensuel" type="number" min="0" value={marketing.budget} onChange={(event) => updateMarketing({ budget: Number(event.target.value || 0) })} />
        </div>
      </Card>

      <Card title="Canaux d'acquisition">
        <div className="space-y-3">
          {marketing.channels.map((channel) => (
            <div key={channel.id} className="grid grid-cols-1 items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300 md:grid-cols-4">
              <label className="flex items-center gap-2 font-medium text-slate-700"><input type="checkbox" checked={channel.enabled} onChange={(event) => updateMarketingChannel(channel.id, { enabled: event.target.checked })} className="accent-cyan-700" />{channel.name}</label>
              <Input label="Budget" type="number" min="0" value={channel.budget} onChange={(event) => updateMarketingChannel(channel.id, { budget: Number(event.target.value || 0) })} />
              <Input label="Portée" type="number" min="0" max="100" value={channel.reach} onChange={(event) => updateMarketingChannel(channel.id, { reach: Number(event.target.value || 0) })} />
              <div className="text-sm text-slate-500">{channel.enabled ? "Actif" : "En pause"}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold text-slate-900">Campagnes</h2><Button onClick={addMarketingCampaign}>Ajouter</Button></div>
        <div className="space-y-3">
          {marketing.campaigns.map((campaign) => (
            <div key={campaign.id} className="grid grid-cols-1 items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300 md:grid-cols-8">
              <Input value={campaign.name} onChange={(event) => updateMarketingCampaign(campaign.id, { name: event.target.value })} />
              <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" value={campaign.objective} onChange={(event) => updateMarketingCampaign(campaign.id, { objective: event.target.value })}><option>Acquisition</option><option>Fidélisation</option><option>Notoriété</option></select>
              <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" value={campaign.status} onChange={(event) => updateMarketingCampaign(campaign.id, { status: event.target.value })}><option value="draft">Brouillon</option><option value="active">Active</option><option value="paused">En pause</option></select>
              <Input type="number" min="0" value={campaign.budget} onChange={(event) => updateMarketingCampaign(campaign.id, { budget: Number(event.target.value || 0) })} />
              <Input type="number" min="0" max="100" value={campaign.conversion} onChange={(event) => updateMarketingCampaign(campaign.id, { conversion: Number(event.target.value || 0) })} />
              <Input type="number" min="0" step="0.1" value={campaign.roi} onChange={(event) => updateMarketingCampaign(campaign.id, { roi: Number(event.target.value || 0) })} />
              <Input type="number" min="0" value={campaign.demandUplift} onChange={(event) => updateMarketingCampaign(campaign.id, { demandUplift: Number(event.target.value || 0) })} />
              <Button type="button" variant="danger" onClick={() => removeMarketingCampaign(campaign.id)}>Supprimer</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

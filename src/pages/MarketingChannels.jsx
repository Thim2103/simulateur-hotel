import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useMarketingEngine } from "../hooks/useMarketingEngine";
import { toggleChannel } from "../lib/marketing/marketingChannels";
import { useCareerContext } from "../context/CareerContext";

// "Canaux marketing / performance / conversion / coût / actions"
// (section 4) -- reads/writes the same hotelState.marketing.channels
// array the old Marketing.jsx page already edited, through the same
// useCareer.js applyHotelAdjustment() mechanism.
export default function MarketingChannels() {
  const { applyHotelAdjustment } = useCareerContext();
  const { marketingState, isRunning, error, loadMarketingState, getChannels } = useMarketingEngine();

  useEffect(() => {
    loadMarketingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channels = getChannels();

  const handleToggle = async (channelId, enabled) => {
    try {
      await applyHotelAdjustment((hotelBundle) => ({
        ...hotelBundle,
        hotelState: { ...hotelBundle.hotelState, marketing: { ...hotelBundle.hotelState.marketing, channels: toggleChannel(hotelBundle.hotelState.marketing?.channels, channelId, enabled) } },
      }));
      await loadMarketingState();
    } catch {
      // error surfaced via `error`.
    }
  };

  if (isRunning && !marketingState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des canaux…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Canaux</h1>
          <p className="mt-1 text-sm text-slate-500">Performance, conversion et coût par canal d'acquisition.</p>
        </div>
        <Link to="/marketing"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!marketingState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée marketing pour le moment. Visitez la page Marketing pour démarrer un cycle.</p></Card>
      ) : channels.length === 0 ? (
        <Card><p className="text-sm text-slate-500">Aucun canal configuré.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {channels.map((channel) => (
            <Card key={channel.id} title={channel.name}>
              <div className="flex flex-col gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <Badge type={channel.enabled !== false ? "success" : "info"}>{channel.enabled !== false ? "Actif" : "En pause"}</Badge>
                  <span className="text-slate-500">Portée {channel.reach}%</span>
                </div>
                <p>Budget : {Number(channel.budget).toLocaleString()} €</p>
                <p>Part de portée : {channel.reachShare ?? 0}%</p>
                <p>Coût par lead : {channel.costPerLead ?? 0} €</p>
                <p>Revenu attribué : {Number(channel.attributedRevenue ?? 0).toLocaleString()} €</p>
                <p className="font-semibold">ROI : {channel.roi ?? 0}x</p>
                <div className="mt-2">
                  <Button variant="outline" onClick={() => handleToggle(channel.id, channel.enabled === false)} disabled={isRunning}>
                    {channel.enabled !== false ? "Mettre en pause" : "Activer"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

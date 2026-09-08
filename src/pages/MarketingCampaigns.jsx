import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useMarketingEngine } from "../hooks/useMarketingEngine";
import { updateCampaignStatus, removeCampaign } from "../lib/marketing/marketingCampaigns";
import { useCareerContext } from "../context/CareerContext";

const STATUS_BADGE = { active: "success", paused: "warning", draft: "info" };
const STATUS_LABEL = { active: "Active", paused: "En pause", draft: "Brouillon" };

// "Liste des campagnes / détails / performance / ROI / actions" (section
// 4) -- reads/writes the same hotelState.marketing.campaigns array
// MarketingDashboard.jsx's "Lancer une campagne" quick action already
// uses, through the same useCareer.js applyHotelAdjustment() mechanism.
export default function MarketingCampaigns() {
  const { applyHotelAdjustment } = useCareerContext();
  const { marketingState, isRunning, error, loadMarketingState, getCampaigns } = useMarketingEngine();

  useEffect(() => {
    loadMarketingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campaigns = getCampaigns();

  const runCampaignUpdate = async (updater) => {
    try {
      await applyHotelAdjustment((hotelBundle) => ({
        ...hotelBundle,
        hotelState: { ...hotelBundle.hotelState, marketing: { ...hotelBundle.hotelState.marketing, campaigns: updater(hotelBundle.hotelState.marketing?.campaigns) } },
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
          Chargement des campagnes…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Campagnes</h1>
          <p className="mt-1 text-sm text-slate-500">Liste, performance et ROI de chaque campagne.</p>
        </div>
        <Link to="/marketing"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!marketingState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée marketing pour le moment. Visitez la page Marketing pour démarrer un cycle.</p></Card>
      ) : campaigns.length === 0 ? (
        <Card><p className="text-sm text-slate-500">Aucune campagne pour le moment. Lancez-en une depuis le tableau de bord Marketing.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} title={campaign.name}>
              <div className="flex flex-col gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{campaign.objective}</span>
                  <Badge type={STATUS_BADGE[campaign.status] || "info"}>{STATUS_LABEL[campaign.status] || campaign.status}</Badge>
                </div>
                <p>Budget : {Number(campaign.budget).toLocaleString()} €</p>
                <p>Conversion : {campaign.conversion}%</p>
                <p className="font-semibold">ROI : {campaign.roi}x</p>
                <p>Revenu généré : {Number(campaign.generatedRevenue ?? 0).toLocaleString()} €</p>
                <p className={campaign.netResult >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  Résultat net : {Number(campaign.netResult ?? 0).toLocaleString()} €
                </p>
                <div className="mt-2 flex gap-2">
                  {campaign.status !== "active" && (
                    <Button variant="outline" onClick={() => runCampaignUpdate((list) => updateCampaignStatus(list, campaign.id, "active"))} disabled={isRunning}>Activer</Button>
                  )}
                  {campaign.status === "active" && (
                    <Button variant="outline" onClick={() => runCampaignUpdate((list) => updateCampaignStatus(list, campaign.id, "paused"))} disabled={isRunning}>Mettre en pause</Button>
                  )}
                  <Button variant="danger" onClick={() => runCampaignUpdate((list) => removeCampaign(list, campaign.id))} disabled={isRunning}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

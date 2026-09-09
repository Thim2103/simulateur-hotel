import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useProEngine } from "../hooks/useProEngine";
import { availableOpportunities, totalPotentialRoi } from "../lib/pro/proOpportunities";

const DEPARTMENT_LABEL = { finance: "Finance", staff: "Équipe", marketing: "Marketing", esg: "ESG", rm: "RM", restaurant: "Restaurant", general: "Général" };
const STATUS_BADGE = { available: "info", seized: "success", expired: "danger" };
const STATUS_LABEL = { available: "Disponible", seized: "Saisie", expired: "Expirée" };

// Route: /pro/opportunities -- opportunités disponibles, leur ROI
// potentiel, et les actions professionnelles pour les saisir. Built on
// the same useProEngine.js as ProDashboard.jsx.
export default function ProOpportunities() {
  const { proState, isRunning, error, loadProState, applyProAction } = useProEngine();

  useEffect(() => {
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!proState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode Professionnel Solo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Opportunités</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun programme professionnel en cours.</p>
          </div>
        </header>
        <Card><Link to="/pro"><Button>Créer mon programme professionnel</Button></Link></Card>
      </div>
    );
  }

  const opportunities = proState.opportunities || [];
  const available = availableOpportunities(opportunities);
  const potentialRoi = totalPotentialRoi(opportunities);
  const seized = opportunities.filter((opportunity) => opportunity.status === "seized");

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Opportunités</h1>
          <p className="mt-1 text-sm text-slate-500">Opportunités stratégiques -- mois {proState.month}/{proState.horizonMonths}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pro/dashboard"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Opportunités disponibles" value={`${available.length}`} />
        <KpiCard label="ROI potentiel" value={`${potentialRoi.toLocaleString()} €`} />
        <KpiCard label="Opportunités saisies" value={`${seized.length}`} />
      </div>

      <Card title="Opportunités">
        {opportunities.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune opportunité déclenchée pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {opportunities.map((opportunity) => (
              <li key={opportunity.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{opportunity.description}</p>
                    <p className="mt-1 text-xs text-slate-500">{DEPARTMENT_LABEL[opportunity.department] || opportunity.department} · ROI estimé : {opportunity.roiEstimate?.toLocaleString() ?? "—"} €</p>
                  </div>
                  <Badge type={STATUS_BADGE[opportunity.status] || "info"}>{STATUS_LABEL[opportunity.status] || opportunity.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section aria-labelledby="opportunities-actions" className="flex flex-col gap-3">
        <h2 id="opportunities-actions" className="text-base font-semibold text-slate-900">Actions pour saisir les opportunités</h2>
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => applyProAction("plan-relance-globale")} disabled={isRunning}>Plan de relance globale</Button>
            <Button variant="outline" onClick={() => applyProAction("optimiser-distribution")} disabled={isRunning}>Optimiser la distribution</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Le plan de relance capture la demande d'un événement local. Optimiser la distribution tire parti d'un partenariat corporate.
          </p>
        </Card>
      </section>
    </div>
  );
}

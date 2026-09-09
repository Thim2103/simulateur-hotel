import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import { useProEngine } from "../hooks/useProEngine";
import { activeCrises } from "../lib/pro/proCrises";

const DEPARTMENT_LABEL = { finance: "Finance", staff: "Équipe", marketing: "Marketing", esg: "ESG", rm: "RM", restaurant: "Restaurant", general: "Général" };

// Route: /pro/crises -- crises actives, leur impact, et les actions
// professionnelles pouvant en atténuer les effets. Built on the same
// useProEngine.js as ProDashboard.jsx.
export default function ProCrises() {
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Crises</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun programme professionnel en cours.</p>
          </div>
        </header>
        <Card><Link to="/pro"><Button>Créer mon programme professionnel</Button></Link></Card>
      </div>
    );
  }

  const crises = proState.crises || [];
  const active = activeCrises(crises);
  const resolved = crises.filter((crisis) => !crisis.active);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Crises</h1>
          <p className="mt-1 text-sm text-slate-500">Crises actives et résolues -- mois {proState.month}/{proState.horizonMonths}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pro/dashboard"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Crises actives" value={`${active.length}`} trend={active.length > 0 ? -1 : undefined} />
        <KpiCard label="Crises résolues" value={`${resolved.length}`} />
      </div>

      <Card title="Crises actives">
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune crise active pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((crisis) => (
              <li key={crisis.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{crisis.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{crisis.description}</p>
                  </div>
                  <Badge type="danger">{DEPARTMENT_LABEL[crisis.department] || crisis.department}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">Encore {crisis.monthsRemaining} mois d'impact estimé.</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Crises résolues">
        {resolved.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune crise résolue pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {resolved.map((crisis) => (
              <li key={crisis.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                <span>{crisis.title}</span>
                <span className="text-slate-500">Résolue au mois {crisis.resolvedOnMonth}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section aria-labelledby="crises-actions" className="flex flex-col gap-3">
        <h2 id="crises-actions" className="text-base font-semibold text-slate-900">Actions de gestion de crise</h2>
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => applyProAction("plan-austerite")} disabled={isRunning}>Plan d'austérité</Button>
            <Button variant="outline" onClick={() => applyProAction("renforcer-equipe")} disabled={isRunning}>Renforcer l'équipe</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Le plan d'austérité protège la trésorerie face à une crise financière. Renforcer l'équipe atténue l'impact d'une pénurie de personnel.
          </p>
        </Card>
      </section>
    </div>
  );
}

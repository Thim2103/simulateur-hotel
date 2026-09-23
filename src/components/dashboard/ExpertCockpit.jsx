import { Link } from "react-router-dom";
import Card from "../ui/Card";

// Étape 7's "Cockpit Directeur": the 5-domain hub Mode Expert opens onto
// (/dashboard#expert). Every existing professional module stays exactly
// where it always was (a Dashboard modal or its own route) -- this is
// only a curated front door onto them, for the player who just switched
// out of Mode Normal and wants the pre-existing power tools without
// hunting through TopBar's own dropdowns.
export default function ExpertCockpit({ onOpenYield, onOpenAccounting, onOpenTfeFeasibility }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-slate-900">🎛️ Cockpit Directeur</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={onOpenYield}
          className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span aria-hidden="true" className="text-xl">📊</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Yield Management & Tarification Avancée</span>
            <span className="text-xs text-slate-500">Règles automatiques et campagnes ciblées</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenAccounting}
          className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span aria-hidden="true" className="text-xl">🧾</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Comptabilité PCMN & Bilans</span>
            <span className="text-xs text-slate-500">Bilan, compte de résultat, ratios financiers</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenTfeFeasibility}
          className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span aria-hidden="true" className="text-xl">🔮</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Faisabilité & Projections TFE (3-5 ans)</span>
            <span className="text-xs text-slate-500">Plan de financement et projections pluriannuelles</span>
          </span>
        </button>

        <Link to="/esg" className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
          <span aria-hidden="true" className="text-xl">🌱</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">RSE & Reporting ESG Détaillé</span>
            <span className="text-xs text-slate-500">Énergie, déchets, eau, certifications</span>
          </span>
        </Link>

        <Link to="/management" className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
          <span aria-hidden="true" className="text-xl">🧹</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Gestion Opérationnelle RH & Housekeeping</span>
            <span className="text-xs text-slate-500">Équipe, planning, entretien</span>
          </span>
        </Link>
      </div>
    </Card>
  );
}

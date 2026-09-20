import { Link } from "react-router-dom";
import { useCareerContext } from "../context/CareerContext";
import { setMaintenanceLevel } from "../lib/maintenance/maintenanceCostEngine";
import { safeArray } from "../lib/safe";
import MaintenanceLevelSelector from "../ui/hotelView/schematic/MaintenanceLevelSelector";
import { BentoCard, SoftButton, StatusBadge } from "../ui/bento";

const HR_LINKS = [
  { to: "/staff", icon: "👔", label: "Équipe & RH", hint: "Effectifs, moral, recrutements" },
  { to: "/staff/forecast", icon: "🗓️", label: "Planning", hint: "Besoins des prochains jours" },
  { to: "/staff/report", icon: "📊", label: "Productivité", hint: "Ce que chaque équipe produit" },
  { to: "/housekeeping", icon: "🧹", label: "Housekeeping", hint: "Chambres à nettoyer, qualité" },
];

// "RH & Maintenance": the people and the upkeep of the hotel on one page --
// the way in to the staff pages, and the upkeep budget (the same selector the
// hotel plan carries, see lib/maintenance/maintenanceCostEngine.js).
export default function Management() {
  const { careerState, error, applyHotelAdjustment } = useCareerContext();
  const hotel = careerState?.hotel;
  const breakdowns = safeArray(hotel?.hotelState?.activeIncidents).filter((incident) => incident.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Exploitation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">RH & Maintenance</h1>
          <p className="mt-1 text-sm text-slate-500">Vos équipes, l'entretien de l'hôtel et ce qu'ils coûtent.</p>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      <div className="bento-grid">
        <BentoCard title="Ressources humaines" icon="👔" tone="action" span={2}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HR_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} data-testid={`management-link-${link.to.replace(/\//g, "-").slice(1)}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg">{link.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{link.label}</span>
                    <span className="block text-xs text-slate-500">{link.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BentoCard>

        <BentoCard title="Pannes en cours" icon="🔧" tone={breakdowns > 0 ? "danger" : "success"}>
          {careerState ? (
            <div className="flex flex-col items-start gap-3">
              <StatusBadge data-testid="management-breakdowns" tone={breakdowns > 0 ? "danger" : "success"}>
                {breakdowns > 0 ? `${breakdowns} panne${breakdowns > 1 ? "s" : ""} à réparer` : "Aucune panne à réparer"}
              </StatusBadge>
              <SoftButton as={Link} to="/dashboard#hotel-plan" tone="action" icon="🏨">Ouvrir le plan de l'hôtel</SoftButton>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Démarrez votre carrière pour suivre vos équipements.</p>
          )}
        </BentoCard>

        <BentoCard title="Budget d'entretien" icon="🔧" tone="success" span={3}>
          {hotel ? (
            <MaintenanceLevelSelector
              hotelState={hotel.hotelState}
              rooms={hotel.rooms}
              onChange={(level) => applyHotelAdjustment((bundle) => setMaintenanceLevel(bundle, level)).catch(() => undefined)}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Démarrez votre carrière pour fixer votre budget d'entretien. <Link to="/dashboard" className="font-semibold text-cyan-700">Aller au tableau de bord →</Link>
            </p>
          )}
        </BentoCard>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useCareerContext } from "../context/CareerContext";
import { hotelCondition, setMaintenanceLevel, WEAR_THRESHOLD } from "../lib/maintenance/maintenanceCostEngine";
import { LEVELS, ROLES, getRoster, hasRoster, rosterDailyPayroll } from "../lib/staff/staffRoster";
import { safeArray, safeNumber } from "../lib/safe.js";
import MaintenanceLevelSelector from "../ui/hotelView/schematic/MaintenanceLevelSelector";
import { ZONE_STYLES } from "../ui/hotelView/schematic/schematicTokens";
import { BentoCard, MetricDonut, SoftButton, StatusBadge } from "../ui/bento";

const HR_LINKS = [
  { to: "/staff", icon: "👔", label: "Équipe & RH", hint: "Effectifs, moral, recrutements" },
  { to: "/staff/forecast", icon: "🗓️", label: "Planning", hint: "Besoins des prochains jours" },
  { to: "/staff/report", icon: "📊", label: "Productivité", hint: "Ce que chaque équipe produit" },
  { to: "/housekeeping", icon: "🧹", label: "Housekeeping", hint: "Chambres à nettoyer, qualité" },
];

// The equipment zones an open incident can hit (see ui/hotelView/engine/
// EntityFactory.js's amenities), in the order the plan shows them.
const EQUIPMENT_ZONES = ["reception", "restaurant", "kitchen", "bar", "laundry", "hall"];

const LEVEL_TONE = { beginner: "neutral", experienced: "action", expert: "vip" };
const euro = (value) => `${Math.round(safeNumber(value, 0)).toLocaleString("fr-FR")} €`;

// A thin bar for one of an employee's two dials. `higherIsBetter` is true for
// morale and false for fatigue, so a full fatigue bar reads red.
function MiniGauge({ label, value, higherIsBetter }) {
  const percent = Math.max(0, Math.min(100, Math.round(safeNumber(value, 0))));
  const health = higherIsBetter ? percent : 100 - percent;
  const color = health >= 60 ? "bg-[var(--ds-success)]" : health >= 35 ? "bg-[var(--ds-vip)]" : "bg-[var(--ds-danger)]";
  return (
    <div className="flex min-w-24 flex-1 flex-col gap-0.5">
      <span className="text-[11px] text-slate-500">{label} {percent}</span>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// The team at a glance: who, in which role, how good, how they are doing.
// Read-only -- hiring, training and raises stay on the staff page.
function StaffRosterCard({ hotelState }) {
  const roster = getRoster(hotelState);
  return (
    <BentoCard title="Équipe" icon="👥" tone="action" span={2} data-testid="management-staff">
      {!hasRoster(hotelState) || roster.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune équipe enregistrée pour l'instant. <Link to="/staff" className="font-semibold text-blue-700 hover:underline">Constituer l'équipe →</Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roster.map((employee) => (
              <li key={employee.id} data-testid={`management-employee-${employee.id}`} className="flex flex-col gap-2 rounded-2xl border border-[var(--ds-border)] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-lift)]">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{String(employee.name || "?").charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{employee.name}</p>
                    <p className="truncate text-xs text-slate-500">{ROLES[employee.role]?.label || employee.role}</p>
                  </div>
                  <StatusBadge tone={LEVEL_TONE[employee.level] || "neutral"}>{LEVELS[employee.level]?.label || employee.level}</StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <MiniGauge label="Moral" value={employee.morale} higherIsBetter />
                  <MiniGauge label="Fatigue" value={employee.fatigue} higherIsBetter={false} />
                </div>
                {(employee.sick || employee.training) && (
                  <div className="flex gap-1.5">
                    {employee.sick && <StatusBadge tone="danger" icon="🤒">Arrêt maladie</StatusBadge>}
                    {employee.training && <StatusBadge tone="mice" icon="🎓">En formation</StatusBadge>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            {roster.length} personne{roster.length > 1 ? "s" : ""} · masse salariale <strong className="text-slate-800">{euro(rosterDailyPayroll(hotelState))} / jour</strong>
          </p>
        </div>
      )}
    </BentoCard>
  );
}

// How worn the hotel is (the upkeep engine's condition, out of 100 -- below
// the wear threshold, breakdowns start) and which equipment has an open
// incident right now.
function EquipmentWearCard({ hotelState }) {
  const condition = Math.round(hotelCondition(hotelState));
  const tone = condition < WEAR_THRESHOLD ? "danger" : condition < 80 ? "vip" : "success";
  const incidents = safeArray(hotelState?.activeIncidents).filter((incident) => incident.status !== "resolved");
  return (
    <BentoCard title="Usure des équipements" icon="🛠️" tone={tone} data-testid="management-wear">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <MetricDonut value={condition} label="État de l'hôtel" display={`${condition}`} caption="/ 100" tone={tone} size="5rem" />
          <p data-testid="management-wear-text" className="text-xs text-slate-600">
            {condition < WEAR_THRESHOLD ? `Sous ${WEAR_THRESHOLD} : des pannes d'usure menacent, relevez le niveau d'entretien.` : `Au-dessus de ${WEAR_THRESHOLD} : l'usure reste maîtrisée.`}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-1.5">
          {EQUIPMENT_ZONES.map((zone) => {
            const incident = incidents.find((item) => item.zone === zone);
            const state = !incident ? "ok" : incident.status === "repairing" ? "repairing" : "broken";
            const style = ZONE_STYLES[zone];
            return (
              <li key={zone} data-testid={`management-equipment-${zone}`} data-state={state} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs">
                <span aria-hidden="true">{style.icon}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{style.label}</span>
                <span aria-hidden="true">{state === "ok" ? "✅" : state === "repairing" ? "🛠️" : "🔧"}</span>
                <span className="sr-only">{state === "ok" ? "en état" : state === "repairing" ? "en réparation" : "en panne"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </BentoCard>
  );
}

// "RH & Maintenance": the people and the upkeep of the hotel on one page --
// the way in to the staff pages, the team, the equipment's wear and the upkeep
// budget (the same selector the hotel plan carries, see
// lib/maintenance/maintenanceCostEngine.js).
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
                <Link to={link.to} data-testid={`management-link-${link.to.replace(/\//g, "-").slice(1)}`} className="flex items-center gap-3 rounded-2xl border border-[var(--ds-border)] p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--ds-shadow-lift)]">
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

        {hotel && <StaffRosterCard hotelState={hotel.hotelState} />}
        {hotel && <EquipmentWearCard hotelState={hotel.hotelState} />}

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

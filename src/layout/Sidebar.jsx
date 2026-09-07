import { NavLink } from "react-router-dom";

// Académie, Compétition, Replay et Analytics stay mounted in App.js and
// fully functional (Academy/Competition write real replay+analytics data
// on finalization, see hooks/useAcademy.js and useCompetition.js) -- they
// are deliberately left out of this nav so the UI only surfaces the Solo/
// Career experience for now. Reaching /academy, /competition, /replay/:id
// or /analytics directly still works.
const primaryLinks = [
  ["/", "Dashboard", true],
  ["/career", "Mode Carrière"],
  ["/chain", "Chaîne d'hôtels"],
  ["/staff", "Personnel"],
  ["/dashboard-rm", "Revenue management"],
  ["/rm-dashboard", "RM avancé"],
  ["/pms", "Planning PMS"],
];

const operationsLinks = [
  ["/reservations", "Réservations"],
  ["/rooms", "Chambres"],
  ["/clients", "Clients"],
  ["/finance", "Finance"],
  ["/housekeeping", "Housekeeping"],
];

const growthLinks = [
  ["/marketing", "Marketing"],
  ["/esg", "ESG"],
  ["/expansion", "Expansion"],
  ["/progression", "Progression"],
];

function NavigationLink({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? "bg-cyan-700 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function NavigationGroup({ label, links }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="space-y-1">
        {links.map(([to, linkLabel, end]) => (
          <NavigationLink key={to} to={to} label={linkLabel} end={end} />
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-full shrink-0 bg-slate-950 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64">
      <div className="flex h-full flex-col gap-6 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Pilotage hôtelier</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">Simulateur Hôtel</h2>
        </div>

        <nav className="flex flex-1 flex-col gap-5" aria-label="Navigation principale">
          <NavigationGroup label="Vue d'ensemble" links={primaryLinks} />
          <NavigationGroup label="Opérations" links={operationsLinks} />
          <NavigationGroup label="Croissance" links={growthLinks} />
          <NavigationGroup label="Restaurant" links={[["/restaurant", "Restaurant Simulator", true]]} />
        </nav>
      </div>
    </aside>
  );
}

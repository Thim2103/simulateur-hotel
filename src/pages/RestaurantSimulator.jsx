import { NavLink, Route, Routes } from "react-router-dom";
import RestaurantOverview from "./RestaurantOverview";
import RestaurantDashboard from "./RestaurantDashboard";
import RestaurantFinance from "./RestaurantFinance";
import RestaurantHR from "./RestaurantHR";
import RestaurantMenu from "./RestaurantMenu";
import RestaurantOperations from "./RestaurantOperations";
import RestaurantMarketing from "./RestaurantMarketing";
import RestaurantESG from "./RestaurantESG";
import RestaurantExpansion from "./RestaurantExpansion";
import Card from "../components/ui/Card";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

const tabs = [
  { to: "overview", label: "Structure" },
  { to: "dashboard", label: "Dashboard" },
  { to: "finance", label: "Finance" },
  { to: "hr", label: "RH" },
  { to: "menu", label: "Menu" },
  { to: "operations", label: "Opérations" },
  { to: "marketing", label: "Marketing" },
  { to: "esg", label: "ESG" },
  { to: "expansion", label: "Expansion" },
];

function LockedModule({ children }) {
  return <Card className="p-8 text-slate-600">{children}</Card>;
}

export default function RestaurantSimulator() {
  const { progression, isModuleUnlocked, setDifficulty, loading, error } = useRestaurantSimulator();

  if (loading) return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><span className="inline-flex items-center gap-2" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />Chargement des données restaurant…</span></div>;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Connexion aux données restaurant indisponible : les valeurs affichées sont issues du mode hors-ligne.
        </div>
      )}
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant simulator</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pilotez votre établissement</h1>
          <p className="mt-1 text-sm text-slate-500">Simulation opérationnelle de restaurant</p>
        </div>
      </header>

      <Card className="border-amber-100 bg-amber-50/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Progression</p>
            <p className="mt-1 text-xl font-bold text-slate-900">Niveau joueur {progression.playerLevel} · {progression.xp} XP</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-700 md:items-end">
            <p>Modules débloqués : <span className="font-semibold">{progression.currentLevel}/{progression.modules.length}</span> · Prochain : <span className="font-semibold">{progression.nextUnlock}</span></p>
            <label className="flex items-center gap-2 font-medium">
              Difficulté
              <select className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100" value={progression.difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="easy">Découverte</option>
                <option value="normal" disabled={progression.playerLevel < 2}>Gestionnaire</option>
                <option value="hard" disabled={progression.playerLevel < 4}>Compétition</option>
                <option value="expert" disabled={progression.playerLevel < 7}>Restauration exigeante</option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Bienvenue dans votre établissement">
          <div className="flex flex-col gap-2">
            {progression.tutorials.map((tutorial) => (
              <div key={tutorial.id} className={`rounded-lg border p-3 transition-colors ${tutorial.completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-slate-900">{tutorial.title}</span>
                  <span className="text-sm text-slate-600">{tutorial.completed ? "Terminé" : tutorial.unlocked ? "À faire" : "Verrouillé"}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{tutorial.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Succès">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {progression.achievements.map((achievement) => (
              <div key={achievement.id} className={`rounded-lg border p-3 transition-colors ${achievement.unlocked ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                <div className="font-medium text-slate-900">{achievement.title}</div>
                <p className="mt-1 text-sm text-slate-600">{achievement.description}</p>
                <div className="mt-2 text-xs text-slate-500">{achievement.unlocked ? `+${achievement.xp} XP gagné` : `${achievement.xp} XP`}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Modules du restaurant">
        {tabs.map((tab) => {
          const unlocked = isModuleUnlocked(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "overview"}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? "bg-amber-500 text-white shadow-sm"
                    : unlocked
                    ? "bg-white text-slate-700 hover:bg-slate-100"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`
              }
              onClick={(event) => {
                if (!unlocked) event.preventDefault();
              }}
            >
              {tab.label}
              {!unlocked && " · verrouillé"}
            </NavLink>
          );
        })}
      </div>

      <Routes>
        <Route path="overview" element={<RestaurantOverview />} />
        <Route path="dashboard" element={isModuleUnlocked("dashboard") ? <RestaurantDashboard /> : <LockedModule>Le module Dashboard est verrouillé. Il s’ouvre avec une progression plus élevée.</LockedModule>} />
        <Route path="finance" element={isModuleUnlocked("finance") ? <RestaurantFinance /> : <LockedModule>Le module Finance est verrouillé. Il s’ouvre après la mise en place du pilotage.</LockedModule>} />
        <Route path="hr" element={isModuleUnlocked("hr") ? <RestaurantHR /> : <LockedModule>Le module RH est verrouillé. Le recrutement et l’organisation doivent être validés.</LockedModule>} />
        <Route path="menu" element={isModuleUnlocked("menu") ? <RestaurantMenu /> : <LockedModule>Le module Menu est verrouillé. Il s’ouvre une fois la carte et les marges sont validées.</LockedModule>} />
        <Route path="operations" element={isModuleUnlocked("operations") ? <RestaurantOperations /> : <LockedModule>Le module Opérations est verrouillé. Il s’ouvre une fois l’exploitation stabilisée.</LockedModule>} />
        <Route path="marketing" element={isModuleUnlocked("marketing") ? <RestaurantMarketing /> : <LockedModule>Le module Marketing est verrouillé. Atteignez le score requis.</LockedModule>} />
        <Route path="esg" element={isModuleUnlocked("esg") ? <RestaurantESG /> : <LockedModule>Le module ESG est verrouillé. Atteignez le score requis.</LockedModule>} />
        <Route path="expansion" element={isModuleUnlocked("expansion") ? <RestaurantExpansion /> : <LockedModule>Le module Expansion est verrouillé. Atteignez le score requis.</LockedModule>} />
        <Route index element={<RestaurantOverview />} />
      </Routes>
    </div>
  );
}

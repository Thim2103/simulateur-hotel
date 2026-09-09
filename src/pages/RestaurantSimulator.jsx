import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import RestaurantStructure from "./RestaurantStructure";
import RestaurantDashboard from "./RestaurantDashboard";
import RestaurantFinance from "./RestaurantFinance";
import RestaurantHR from "./RestaurantHR";
import RestaurantMenu from "./RestaurantMenu";
import RestaurantOperations from "./RestaurantOperations";
import RestaurantMarketing from "./RestaurantMarketing";
import RestaurantESG from "./RestaurantESG";
import RestaurantExpansion from "./RestaurantExpansion";
import RestaurantMenuEngineering from "./RestaurantMenuEngineering";
import RestaurantFoodCost from "./RestaurantFoodCost";
import RestaurantPopularity from "./RestaurantPopularity";
import RestaurantProfitability from "./RestaurantProfitability";
import RestaurantForecast from "./RestaurantForecast";
import RestaurantReport from "./RestaurantReport";
import Card from "../components/ui/Card";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

const tabs = [
  { to: "overview", label: "Structure" },
  { to: "dashboard", label: "Dashboard" },
  { to: "finance", label: "Finance" },
  { to: "hr", label: "RH" },
  { to: "menu", label: "Menu" },
  { to: "menu-engineering", label: "Menu Engineering" },
  { to: "food-cost", label: "Food Cost" },
  { to: "popularity", label: "Popularité" },
  { to: "profitability", label: "Rentabilité" },
  { to: "forecast", label: "Forecast" },
  { to: "report", label: "Rapport" },
  { to: "operations", label: "Opérations" },
  { to: "marketing", label: "Marketing" },
  { to: "esg", label: "ESG" },
  { to: "expansion", label: "Expansion" },
];

export default function RestaurantSimulator() {
  const navigate = useNavigate();
  const { progression, setDifficulty, loading, error, reload } = useRestaurantSimulator();

  // Called once the "Structure de l'établissement" form (a separate hook
  // instance, see useRestaurant.js) has persisted progression.ready = true
  // -- re-fetches this page's own state so `progression.ready` below picks
  // it up immediately, then moves the player straight into the Menu tab
  // instead of leaving them stranded on the now-redundant Étape 1 screen.
  const handleStructureValidated = async () => {
    await reload();
    navigate("menu");
  };

  if (loading) return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><span className="inline-flex items-center gap-2" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />Chargement des données restaurant…</span></div>;

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Connexion aux données restaurant indisponible : {error.message}
      </div>
    );
  }

  // The establishment must be validated (see RestaurantStructure.jsx) before
  // any other module is reachable -- no offline mode, no mocked KPIs shown
  // in place of a real establishment.
  if (!progression.ready) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Restaurant simulator</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pilotez votre établissement</h1>
            <p className="mt-1 text-sm text-slate-500">Commencez par décrire votre établissement.</p>
          </div>
        </header>
        <RestaurantStructure onValidated={handleStructureValidated} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* Every tab is reachable as soon as the establishment is validated
          (progression.ready, checked above) -- no further per-module score
          gating once the player has cleared the real first step. */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Modules du restaurant">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "overview"}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                isActive ? "bg-amber-500 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route path="overview" element={<RestaurantStructure onValidated={reload} />} />
        <Route path="dashboard" element={<RestaurantDashboard />} />
        <Route path="finance" element={<RestaurantFinance />} />
        <Route path="hr" element={<RestaurantHR />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="menu-engineering" element={<RestaurantMenuEngineering />} />
        <Route path="food-cost" element={<RestaurantFoodCost />} />
        <Route path="popularity" element={<RestaurantPopularity />} />
        <Route path="profitability" element={<RestaurantProfitability />} />
        <Route path="forecast" element={<RestaurantForecast />} />
        <Route path="report" element={<RestaurantReport />} />
        <Route path="operations" element={<RestaurantOperations />} />
        <Route path="marketing" element={<RestaurantMarketing />} />
        <Route path="esg" element={<RestaurantESG />} />
        <Route path="expansion" element={<RestaurantExpansion />} />
        <Route index element={<RestaurantDashboard />} />
      </Routes>
    </div>
  );
}

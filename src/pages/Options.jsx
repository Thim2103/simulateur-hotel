import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import DashboardViewModeToggle from "../components/dashboard/DashboardViewModeToggle";
import { useDashboard } from "../hooks/useDashboard";

// Reuses the Dashboard's own casual/expert preference (see
// hooks/useDashboard.js) instead of introducing a second, separate
// settings store -- it's the same preference either way, this just gives
// it a home reachable from the main menu too.
export default function Options() {
  const { dashboardState, loadDashboardState, setViewMode } = useDashboard();
  const viewMode = dashboardState?.viewMode || "casual";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-white">
      <h1 className="text-2xl font-bold tracking-tight">Options</h1>
      <Card className="w-full max-w-sm bg-white text-slate-900">
        <p className="mb-2 text-sm font-semibold text-slate-900">Mode d'affichage</p>
        <p className="mb-3 text-sm text-slate-500">Casual pour des libellés simples, Expert pour le vocabulaire hôtelier complet (ADR, RevPAR…).</p>
        <DashboardViewModeToggle
          viewMode={viewMode}
          onChange={(mode) => {
            (dashboardState ? setViewMode(mode) : loadDashboardState().then(() => setViewMode(mode))).catch(() => undefined);
          }}
        />
      </Card>
      <Link to="/menu" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">← Retour au menu</Link>
    </div>
  );
}

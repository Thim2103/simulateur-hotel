import Card from "../ui/Card";
import Button from "../ui/Button";

const CATEGORY_LABEL = { pricing: "Tarifs", staff: "Personnel", marketing: "Marketing", operations: "Opérations" };

// "Actions rapides" -- ajuster prix / staff / marketing / opérations, see
// lib/dashboard/dashboardActions.js's QUICK_ACTION_CATALOG. Each click
// runs a real, persisted adjustment on the player's hotel through
// useDashboard.js's applyQuickAction().
export default function DashboardQuickActions({ quickActions, onRunAction, isRunning }) {
  return (
    <section aria-labelledby="dashboard-quick-actions" className="flex flex-col gap-3">
      <h2 id="dashboard-quick-actions" className="text-base font-semibold text-slate-900">Actions rapides</h2>
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(quickActions || []).map((action) => (
            <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
              </div>
              <Button variant="outline" onClick={() => onRunAction(action.id)} disabled={isRunning}>
                Appliquer
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";

// "Décisions du jour" -- the quick-action catalog (dashboardActions.js)
// grouped by theme (see lib/dashboard/dailyDecisions.js) instead of one
// flat list, each group linking through to its full module.
export default function DecisionsPanel({ groups, onRunAction, isRunning }) {
  return (
    <section aria-labelledby="decisions-panel-title" className="flex flex-col gap-3">
      <h2 id="decisions-panel-title" className="text-base font-semibold text-slate-900">Décisions du jour</h2>
      {!groups || groups.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Aucune décision rapide disponible pour l'instant.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
                <Link to={group.moduleLink} className="text-xs font-medium text-cyan-700 hover:underline">
                  Ouvrir le module →
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {group.actions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => onRunAction(action.id)} disabled={isRunning}>
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

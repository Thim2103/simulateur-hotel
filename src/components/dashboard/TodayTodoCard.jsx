import { Link } from "react-router-dom";
import Card from "../ui/Card";

// Mode Normal's "À FAIRE AUJOURD'HUI" (Étape 2 of the "board game
// numérique" redesign): the single most pressing alert (urgentItems(),
// already ranked most severe first) plus 1-2 suggested decisions (the
// same quick-action catalog DecisionsPanel/QuickActions already use) --
// nothing new is computed here, this only picks the top of lists that
// already exist so a first-time player sees one clear next step instead
// of the full notification/decision panels.
export default function TodayTodoCard({ alert, suggestions = [], onRunAction }) {
  if (!alert && suggestions.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">À faire aujourd'hui</h2>
      <div className="flex flex-col gap-3">
        {alert && (
          <Link to={alert.to} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 hover:bg-amber-100">
            <span aria-hidden="true">{alert.icon || "⚠️"}</span>
            <span className="font-medium">{alert.label}</span>
          </Link>
        )}
        {suggestions.slice(0, 2).map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onRunAction(action.id)}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
          >
            <span className="text-slate-700">{action.label}</span>
            <span className="shrink-0 font-medium text-cyan-700">Appliquer →</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

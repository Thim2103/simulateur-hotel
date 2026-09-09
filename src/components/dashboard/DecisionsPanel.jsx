import { useState } from "react";
import { Link } from "react-router-dom";
import GamePanel from "../../ui/components/GamePanel";
import GameCard from "../../ui/components/GameCard";
import GameButton from "../../ui/components/GameButton";
import { fadeIn } from "../../ui/animations";

const THEME_ICON = { pricing: "💰", staff: "👔", marketing: "📣", restaurant: "🍽️" };

// One decision card: tracks its own brief "just applied" flash (visual
// feedback on selection, per the spec) -- purely local UI state, the real
// persisted effect is `onRunAction` itself (useDashboard.js's
// applyQuickAction()).
function DecisionCard({ action, onRunAction, isRunning }) {
  const [justApplied, setJustApplied] = useState(false);

  const handleClick = () => {
    onRunAction(action.id);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 900);
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-2 transition-colors duration-300 ${
        justApplied ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{action.label}</p>
        <p className="text-xs text-slate-500">{action.description}</p>
      </div>
      <GameButton variant={justApplied ? "outline" : "primary"} onClick={handleClick} disabled={isRunning}>
        {justApplied ? "✓ Appliqué" : "Appliquer"}
      </GameButton>
    </div>
  );
}

// "Décisions du jour" -- the quick-action catalog (dashboardActions.js)
// grouped by theme (see lib/dashboard/dailyDecisions.js) instead of one
// flat list, each group linking through to its full module.
export default function DecisionsPanel({ groups, onRunAction, isRunning }) {
  return (
    <GamePanel title="Décisions du jour">
      {!groups || groups.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune décision rapide disponible pour l'instant.</p>
      ) : (
        <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${fadeIn}`}>
          {groups.map((group) => (
            <GameCard key={group.id} icon={THEME_ICON[group.id]} title={group.label}>
              <Link to={group.moduleLink} className="mb-2 inline-block text-xs font-medium text-cyan-700 hover:underline">
                Ouvrir le module →
              </Link>
              <div className="flex flex-col gap-2">
                {group.actions.map((action) => (
                  <DecisionCard key={action.id} action={action} onRunAction={onRunAction} isRunning={isRunning} />
                ))}
              </div>
            </GameCard>
          ))}
        </div>
      )}
    </GamePanel>
  );
}

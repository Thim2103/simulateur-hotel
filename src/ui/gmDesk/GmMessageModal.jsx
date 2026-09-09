import { useState } from "react";
import { Link } from "react-router-dom";
import GameModal from "../components/GameModal";
import GameButton from "../components/GameButton";
import GameBadge from "../components/GameBadge";
import { messageTypeMeta } from "./GmMessageTypes";
import { openModuleForMessage } from "./GmMessageRouter";

// The message's full detail + its decisions (3-4 choices, see
// GmMessageGenerator.js -- each is a real action from the owning module's
// own catalog, e.g. lib/staff/staffActions.js's STAFF_ACTION_CATALOG).
// Selecting one arms the "Appliquer" button; applying it calls
// GmDeskProvider's applyMessageDecision(), which routes through
// GmMessageRouter.js to the real applyXDecision().
export default function GmMessageModal({ message, onClose, onApply, isApplying }) {
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [applied, setApplied] = useState(false);

  if (!message) return null;
  const meta = messageTypeMeta(message.type);

  const handleApply = async () => {
    if (!selectedActionId) return;
    await onApply(message, selectedActionId);
    setApplied(true);
  };

  return (
    <GameModal open={Boolean(message)} onClose={onClose} title={message.title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">{meta.icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{meta.title}</span>
          <GameBadge tone={message.severity}>{message.severity}</GameBadge>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Contexte</p>
          <p className="mt-1 text-sm text-slate-700">{message.description}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Impact potentiel</p>
          <p className="mt-1 text-sm text-slate-700">
            {message.severity === "high"
              ? "Nécessite une action rapide : l'impact ne fera qu'empirer si rien n'est fait."
              : message.severity === "medium"
              ? "À traiter dans les prochains jours pour éviter que la situation ne se dégrade."
              : "Une opportunité à saisir, sans urgence particulière."}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Décisions possibles</p>
          <div className="flex flex-col gap-2">
            {message.actions.map((action) => (
              <label
                key={action.id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition-colors duration-150 ${
                  selectedActionId === action.id ? "border-[#e9ab1f] bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="gm-message-action"
                  className="mt-1"
                  checked={selectedActionId === action.id}
                  onChange={() => setSelectedActionId(action.id)}
                />
                <span>
                  <span className="block font-medium text-slate-900">{action.label}</span>
                  {action.description && <span className="block text-xs text-slate-500">{action.description}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link to={openModuleForMessage(message)} onClick={onClose} className="text-xs font-medium text-cyan-700 hover:underline">
            Ouvrir le module →
          </Link>
          <GameButton variant="gold" onClick={handleApply} disabled={!selectedActionId || isApplying}>
            {applied ? "✓ Appliqué" : isApplying ? "Application…" : "Appliquer"}
          </GameButton>
        </div>
      </div>
    </GameModal>
  );
}

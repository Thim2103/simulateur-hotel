import { useState } from "react";
import { Link } from "react-router-dom";
import GamePanel from "../components/GamePanel";
import GameNotification from "../components/GameNotification";
import { useGmDesk } from "./GmDeskProvider";
import GmInbox from "./GmInbox";
import GmMessageModal from "./GmMessageModal";
import { fadeIn } from "../animations";

// The GM Desk (route /gm-desk): the narrative + decisional inbox that
// centralises messages from every business module (see
// GmMessageGenerator.js), the "voix de l'hôtel" the spec asks for. Reads
// from GmDeskProvider.jsx (mounted once, globally, in App.js -- see its
// own docstring) so this page, the MyHotel "📬 GM Desk" button/badge (see
// pages/Dashboard.jsx) and DailyReview.jsx's "Messages reçus aujourd'hui"
// section all share one inbox.
export default function GmDesk() {
  const { messages, applyMessageDecision } = useGmDesk();
  const [openMessage, setOpenMessage] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [notification, setNotification] = useState(null);

  const highCount = messages.filter((m) => m.severity === "high").length;
  const mediumCount = messages.filter((m) => m.severity === "medium").length;
  const lowCount = messages.filter((m) => m.severity === "low").length;

  const handleApply = async (message, actionId) => {
    setIsApplying(true);
    try {
      await applyMessageDecision(message, actionId);
      setNotification({ tone: "success", message: `Décision appliquée : ${message.actions.find((a) => a.id === actionId)?.label || actionId}.` });
    } catch (error) {
      setNotification({ tone: "danger", message: `Impossible d'appliquer cette décision : ${error.message}` });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className={`flex flex-col gap-6 ${fadeIn}`}>
      <header className="page-header">
        <div>
          <p className="eyebrow">📬 GM Desk</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">La voix de l'hôtel</h1>
          <p className="mt-1 text-sm text-slate-500">RH, Staff, Housekeeping, Restaurant, Finance, Marketing, RM, ESG, Clients, Owner -- tout au même endroit.</p>
        </div>
        <Link to="/dashboard" className="text-sm font-medium text-cyan-700 hover:underline">← Retour à l'hôtel</Link>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center">
          <p className="text-2xl font-bold text-rose-700">{highCount}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Priorité haute</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{mediumCount}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Priorité moyenne</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{lowCount}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Basse / opportunités</p>
        </div>
      </div>

      <GamePanel title="Messages">
        <GmInbox messages={messages} onOpen={setOpenMessage} />
      </GamePanel>

      <GmMessageModal message={openMessage} onClose={() => setOpenMessage(null)} onApply={handleApply} isApplying={isApplying} />

      {notification && <GameNotification tone={notification.tone} message={notification.message} onDismiss={() => setNotification(null)} />}
    </div>
  );
}

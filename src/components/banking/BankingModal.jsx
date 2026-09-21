import { Link } from "react-router-dom";
import GameModal from "../../ui/components/GameModal";
import BankingPanel from "./BankingPanel";

// The bank as a modal on the dashboard (see BankingPanel.jsx): the hotel's
// financial health, the loans on offer and the ones running.
export default function BankingModal({ hotelState, onTake, onRepay, onClose }) {
  return (
    <GameModal open onClose={onClose} title="🏦 Banque & Emprunts" tone="success" className="flex max-h-[85vh] max-w-xl flex-col gap-4 overflow-y-auto">
      <BankingPanel hotelState={hotelState} onTake={onTake} onRepay={onRepay} />
      <Link to="/finance/banking" onClick={onClose} className="text-xs font-medium text-cyan-700 underline">
        Ouvrir la page de la banque →
      </Link>
    </GameModal>
  );
}

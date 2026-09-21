import { Link } from "react-router-dom";
import GameModal from "../../ui/components/GameModal";
import LoyaltyPanel from "./LoyaltyPanel";

// The loyalty club as a modal on the dashboard (see LoyaltyPanel.jsx):
// launching it, its members, what it saves and costs, and the perks.
export default function LoyaltyProgramModal({ hotelState, reservations, date, onLaunch, onToggleBenefit, onClose }) {
  return (
    <GameModal open onClose={onClose} title="🎖️ Club & Fidélité" tone="vip" className="flex max-h-[85vh] max-w-xl flex-col gap-4 overflow-y-auto">
      <LoyaltyPanel hotelState={hotelState} reservations={reservations} date={date} onLaunch={onLaunch} onToggleBenefit={onToggleBenefit} />
      <Link to="/clients/loyalty" onClick={onClose} className="text-xs font-medium text-cyan-700 underline">
        Ouvrir la page du club →
      </Link>
    </GameModal>
  );
}

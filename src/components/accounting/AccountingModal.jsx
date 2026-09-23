import GameModal from "../../ui/components/GameModal";
import AccountingPanel from "./AccountingPanel";

// "Bilan Comptable & Compte de Résultat" as a modal (see
// AccountingPanel.jsx), from the top-bar's Finance menu or the dashboard.
export default function AccountingModal({ hotelState, restaurantState, day, onClose }) {
  return (
    <GameModal open onClose={onClose} title="📊 Bilan Comptable & Résultat" tone="mice" className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-y-auto">
      <AccountingPanel hotelState={hotelState} restaurantState={restaurantState} day={day} />
    </GameModal>
  );
}

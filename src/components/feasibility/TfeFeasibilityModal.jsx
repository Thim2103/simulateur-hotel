import GameModal from "../../ui/components/GameModal";
import TfeFeasibilityPanel from "./TfeFeasibilityPanel";

// "Plan d'Amortissements & Financement Initial" (TFE, Partie 1) as a modal
// (see TfeFeasibilityPanel.jsx), from the top-bar's Finance menu or the
// dashboard.
export default function TfeFeasibilityModal({ hotelState, restaurantState, rooms, day, dailyReport, onClose }) {
  return (
    <GameModal open onClose={onClose} title="🎓 Plan de Faisabilité TFE" tone="vip" className="flex max-h-[85vh] max-w-3xl flex-col gap-4 overflow-y-auto">
      <TfeFeasibilityPanel hotelState={hotelState} restaurantState={restaurantState} rooms={rooms} day={day} dailyReport={dailyReport} />
    </GameModal>
  );
}

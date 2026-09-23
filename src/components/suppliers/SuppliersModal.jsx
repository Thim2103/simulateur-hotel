import GameModal from "../../ui/components/GameModal";
import SuppliersPanel from "./SuppliersPanel";

// "Fournisseurs & Catalogue d'Équipements" as a modal (see
// SuppliersPanel.jsx), from the top-bar's Hôtel menu or the dashboard.
export default function SuppliersModal({ hotelState, onPurchase, onClose }) {
  return (
    <GameModal open onClose={onClose} title="📦 Fournisseurs & Catalogue" tone="action" className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-y-auto">
      <SuppliersPanel hotelState={hotelState} onPurchase={onPurchase} />
    </GameModal>
  );
}

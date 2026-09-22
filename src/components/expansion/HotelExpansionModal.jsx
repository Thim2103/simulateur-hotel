import GameModal from "../../ui/components/GameModal";
import MajorProjectsPanel from "./MajorProjectsPanel";

// "Chantiers & Extensions": the major projects as a modal (see
// MajorProjectsPanel.jsx), from the hotel plan, the top-bar's Hôtel menu or the
// dashboard.
export default function HotelExpansionModal({ hotelState, rooms, day, onStart, onClose }) {
  return (
    <GameModal open onClose={onClose} title="🏗️ Chantiers & Extensions" tone="vip" className="flex max-h-[85vh] max-w-xl flex-col gap-4 overflow-y-auto">
      <MajorProjectsPanel hotelState={hotelState} rooms={rooms} day={day} onStart={onStart} />
    </GameModal>
  );
}

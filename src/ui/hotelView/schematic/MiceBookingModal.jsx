import { Link } from "react-router-dom";
import GameModal from "../../components/GameModal";
import MicePanel from "../../../components/mice/MicePanel";

// The MICE desk as a modal on the schematic view (see components/mice/
// MicePanel.jsx): quotes for seminars and corporate events, the meeting rooms'
// calendar and the guaranteed revenue. Opened from a meeting room or the
// « Séminaires » chip; `onRespond(requestId, action)` answers a quote.
export default function MiceBookingModal({ hotelState, rooms, reservations, date, onRespond, onClose }) {
  return (
    <GameModal open onClose={onClose} title="🤝 Séminaires & événements pro" tone="mice" className="flex max-h-[85vh] max-w-xl flex-col gap-4 overflow-y-auto">
      <MicePanel hotelState={hotelState} rooms={rooms} reservations={reservations} date={date} onRespond={onRespond} />
      <Link to="/corporate/events" onClick={onClose} className="text-xs font-medium text-cyan-700 underline">
        Ouvrir la page des événements pro →
      </Link>
    </GameModal>
  );
}

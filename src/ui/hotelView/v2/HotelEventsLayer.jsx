import { useEffect, useState } from "react";
import { slideUp } from "../../animations";

const CATEGORY_ICON = {
  weather: "☁️",
  staff: "👔",
  "restaurant-rush": "🍽️",
  "health-inspection": "🩺",
  "power-outage": "⚡",
  "staff-strike": "✊",
  "customer-reviews": "⭐",
  "technical-incidents": "🔧",
  "local-events": "🎉",
  "vip-guest": "👑",
};

function iconFor(event) {
  return CATEGORY_ICON[event.id] || CATEGORY_ICON[event.category] || "❗";
}

const AUTO_DISMISS_MS = 4000;

// The operational-flow layer: today's scenario events (see
// lib/replay/replayEvents.js's eventsForCycle() -- already computed by
// dashboardEngine.js's buildReplaySummary() and passed down as
// `todaysEvents`) rendered as small, auto-dismissing badges -- the
// "check-in/housekeeping/restaurant/incident" flows the spec asks for,
// read from the real event catalogue (lib/events/eventDefinitions.js)
// rather than invented ones. `decisionFeedback` (see decisionFeedback.js)
// adds one more transient badge for the player's own last decision, so a
// pricing/staff/marketing/restaurant action visibly "happens" on the
// hotel, not just in DecisionsPanel's own UI.
export default function HotelEventsLayer({ todaysEvents = [], decisionFeedback = null }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    setVisible(todaysEvents.map((event, index) => ({ id: `${event.id || "event"}-${index}`, icon: iconFor(event), label: event.message || event.name })));
  }, [todaysEvents]);

  useEffect(() => {
    if (!decisionFeedback) return undefined;
    const item = { id: `decision-${decisionFeedback.nonce}`, icon: "🧭", label: `Décision : ${decisionFeedback.target}` };
    setVisible((current) => [...current, item]);
    const timer = setTimeout(() => {
      setVisible((current) => current.filter((entry) => entry.id !== item.id));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [decisionFeedback]);

  if (visible.length === 0) {
    return <p className="text-xs text-slate-400">Aucun événement particulier pour l'instant.</p>;
  }

  return (
    <ul aria-label="Événements du jour" className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <li key={item.id} className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 ${slideUp}`}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

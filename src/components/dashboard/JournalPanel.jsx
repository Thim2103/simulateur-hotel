import { Link } from "react-router-dom";
import Card from "../ui/Card";

// The "Journal" space (Étape 2 of the "board game numérique" redesign):
// what happened and why, in plain language -- today's causal chain
// (lib/dashboard/dailyReview.js's buildDailyReview(), the exact same
// story DashboardBento's TodaySummaryCard already tells), plus the two
// standing logs a player would otherwise have to hunt for in the Expert
// menus: client reviews and the GM Desk's messages. No new engine, no
// new state -- purely a reading of what already exists.
export default function JournalPanel({ causalChain = [], reviewsToAnswer = 0, gmMessageCount = 0 }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-slate-900">📖 Journal</h2>
      {causalChain.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {causalChain.map((line, index) => (
            <li key={index} className="rounded-lg border border-slate-200 p-2">{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Aucun événement notable pour l'instant.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link to="/clients/reviews" className="font-medium text-cyan-700 hover:underline">
          Avis clients {reviewsToAnswer > 0 ? `(${reviewsToAnswer} en attente)` : ""} →
        </Link>
        <Link to="/gm-desk" className="font-medium text-cyan-700 hover:underline">
          GM Desk {gmMessageCount > 0 ? `(${gmMessageCount})` : ""} →
        </Link>
      </div>
    </Card>
  );
}

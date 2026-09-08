import Card from "../ui/Card";

// "Résumé du jour précédent" -- reconstructed through the Replay module
// (see lib/dashboard/dashboardEngine.js's buildReplaySummary()), not read
// straight off careerState so it stays consistent with ReplayViewer.jsx.
export default function DashboardReplaySummary({ replaySummary }) {
  if (!replaySummary) {
    return (
      <section aria-labelledby="dashboard-replay-summary" className="flex flex-col gap-3">
        <h2 id="dashboard-replay-summary" className="text-base font-semibold text-slate-900">Résumé du jour précédent</h2>
        <Card>
          <p className="text-sm text-slate-500">Aucune journée jouée pour le moment.</p>
        </Card>
      </section>
    );
  }

  const { kpis, events, decisions } = replaySummary;

  return (
    <section aria-labelledby="dashboard-replay-summary" className="flex flex-col gap-3">
      <h2 id="dashboard-replay-summary" className="text-base font-semibold text-slate-900">Résumé du jour précédent</h2>
      <Card>
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          <li>Profit : {kpis.profit ?? "—"} €</li>
          <li>Score du jour : {kpis.score ?? "—"}</li>
          <li>Revenu hôtel : {kpis.hotelRevenue ?? "—"} € · Revenu restaurant : {kpis.restaurantRevenue ?? "—"} €</li>
          <li>Événements : {events.length === 0 ? "aucun" : events.map((event) => event.message || event.name).join(", ")}</li>
          <li>Décisions du jour : {Object.keys(decisions || {}).length === 0 ? "aucune" : Object.entries(decisions).map(([key, value]) => `${key}: ${value}`).join(", ")}</li>
        </ul>
      </Card>
    </section>
  );
}

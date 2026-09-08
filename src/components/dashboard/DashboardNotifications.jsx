import Card from "../ui/Card";
import Badge from "../ui/Badge";

const BUCKETS = [
  { key: "problems", title: "Problèmes", badge: "danger", empty: "Aucun problème détecté." },
  { key: "alerts", title: "Alertes", badge: "warning", empty: "Aucune alerte pour le moment." },
  { key: "opportunities", title: "Opportunités", badge: "success", empty: "Aucune opportunité identifiée pour l'instant." },
];

// "À votre attention" -- problems (red), alerts (orange), opportunities
// (green), see lib/dashboard/dashboardNotifications.js.
export default function DashboardNotifications({ notifications }) {
  const buckets = notifications || { problems: [], alerts: [], opportunities: [] };

  return (
    <section aria-labelledby="dashboard-notifications" className="flex flex-col gap-3">
      <h2 id="dashboard-notifications" className="text-base font-semibold text-slate-900">À votre attention</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {BUCKETS.map(({ key, title, badge, empty }) => (
          <Card key={key}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <Badge type={badge}>{buckets[key].length}</Badge>
            </div>
            {buckets[key].length === 0 ? (
              <p className="text-sm text-slate-500">{empty}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                {buckets[key].map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 p-2">{item.message}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

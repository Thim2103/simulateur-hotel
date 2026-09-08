import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { topRecommendations } from "../../lib/dashboard/dashboardInsights";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// "Insights" -- Analytics diagnostics/recommendations for the career so
// far (see lib/analytics/analyticsEngine.js's analyzeRun(), already
// computed by useCareer.js's nextDay()).
export default function DashboardInsights({ insights }) {
  if (!insights || !insights.hasInsights) {
    return (
      <section aria-labelledby="dashboard-insights" className="flex flex-col gap-3">
        <h2 id="dashboard-insights" className="text-base font-semibold text-slate-900">Insights</h2>
        <Card>
          <p className="text-sm text-slate-500">Jouez une journée pour obtenir vos premiers insights.</p>
        </Card>
      </section>
    );
  }

  const recommendations = topRecommendations(insights, 3);

  return (
    <section aria-labelledby="dashboard-insights" className="flex flex-col gap-3">
      <h2 id="dashboard-insights" className="text-base font-semibold text-slate-900">Insights</h2>
      <Card>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">Rien à signaler pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                <span className="text-slate-700">{recommendation.text}</span>
                <Badge type={SEVERITY_BADGE[recommendation.severity] || "info"}>{recommendation.severity}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

// Turns the Dashboard's own "problems/alerts/opportunities" notification
// buckets (see dashboardNotifications.js) into the short, actionable list
// "MyHotel" (pages/Dashboard.jsx) shows under "Ce qui demande votre
// attention aujourd'hui": at most a handful of items, most severe first,
// each pointing at the module page that can actually address it.
import { safeArray } from "../safe";

const SEVERITY_BY_BUCKET = { problems: "high", alerts: "medium", opportunities: "low" };
const BUCKET_LABEL = { problems: "Problème", alerts: "Alerte", opportunities: "Opportunité" };

// Keyword -> destination module, checked in order against the
// notification's own message text. Falls back to the general Insights
// section (/analytics) when nothing matches -- every item still gets a
// working "Analyser" link.
const MODULE_ROUTES = [
  { test: /housekeeping|ménage|chambres à nettoyer/i, to: "/housekeeping", label: "Housekeeping" },
  { test: /staff|équipe|personnel|moral/i, to: "/staff", label: "Personnel" },
  { test: /prix|tarif|occupation|adr/i, to: "/rm-dashboard", label: "Revenue Management" },
  { test: /satisfaction|avis|review/i, to: "/clients/reviews", label: "Avis clients" },
  { test: /marketing|budget|roi/i, to: "/marketing", label: "Marketing" },
  { test: /restaurant|f&b|food/i, to: "/restaurant/menu", label: "Restaurant" },
  { test: /esg|énergie|déchets|eau/i, to: "/esg", label: "ESG" },
  { test: /profit|ebitda|trésorerie|cash/i, to: "/finance", label: "Finance" },
];

function resolveModule(message) {
  const match = MODULE_ROUTES.find((route) => route.test.test(message || ""));
  return match ? { to: match.to, label: match.label } : { to: "/analytics", label: "Analyses" };
}

// Flattens the three buckets into one attention list, in
// problems -> alerts -> opportunities order, truncated to `limit` (default
// 5 per the spec).
export function buildAttentionItems(notifications, limit = 5) {
  const buckets = ["problems", "alerts", "opportunities"];
  const items = buckets.flatMap((bucket) =>
    safeArray(notifications?.[bucket]).map((item) => {
      const target = resolveModule(item.message);
      return {
        id: item.id,
        bucket,
        bucketLabel: BUCKET_LABEL[bucket],
        message: item.message,
        severity: item.severity || SEVERITY_BY_BUCKET[bucket],
        moduleLabel: target.label,
        moduleLink: target.to,
      };
    })
  );
  return items.slice(0, limit);
}

export default buildAttentionItems;

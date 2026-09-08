// Turns a day's DailyReport + KPIs + the Analytics diagnostics for the
// career-so-far (see lib/analytics/analyticsDiagnostics.js) into the
// three buckets the "À votre attention" section shows: problems (red),
// alerts (orange), opportunities (green).
import { safeArray, safeNumber } from "../safe";

// Analytics diagnostics already come typed as "error" | "anomaly" |
// "opportunity" -- exactly the three buckets the Dashboard wants, so this
// is a straight relabeling, not a new classification.
const DIAGNOSTIC_BUCKET = { error: "problems", anomaly: "alerts", opportunity: "opportunities" };

function notification(id, message, meta = {}) {
  return { id, message, ...meta };
}

// Diagnostics are about the run as a whole (any past cycle); only the
// most recent handful are relevant to "what needs my attention today".
export function notificationsFromDiagnostics(diagnostics) {
  const buckets = { problems: [], alerts: [], opportunities: [] };
  safeArray(diagnostics).forEach((diagnostic, index) => {
    const bucket = DIAGNOSTIC_BUCKET[diagnostic?.type] || "alerts";
    buckets[bucket].push(notification(`diagnostic-${index}`, diagnostic.message, { severity: diagnostic.severity, source: "analytics" }));
  });
  return buckets;
}

// Immediate, rule-based reactions to today's own numbers -- independent
// of the Analytics history, so a brand-new career (day 1, no diagnostics
// yet) still gets a meaningful "À votre attention" section.
export function notificationsFromKpis(kpis) {
  const buckets = { problems: [], alerts: [], opportunities: [] };
  if (!kpis) return buckets;

  const profit = safeNumber(kpis.profit, 0);
  if (profit < 0) {
    buckets.problems.push(notification("profit-negative", `Le profit du jour est négatif (${profit} €).`, { source: "kpis" }));
  }

  const occupancyRate = safeNumber(kpis.occupancyRate, null);
  if (occupancyRate !== null) {
    if (occupancyRate < 40) {
      buckets.alerts.push(notification("occupancy-low", `Occupation faible (${occupancyRate}%) : envisagez une action marketing.`, { source: "kpis" }));
    } else if (occupancyRate >= 85) {
      buckets.opportunities.push(notification("occupancy-high", `Occupation élevée (${occupancyRate}%) : c'est le moment d'augmenter les prix.`, { source: "kpis" }));
    }
  }

  const satisfaction = safeNumber(kpis.satisfaction, null);
  if (satisfaction !== null && satisfaction < 3) {
    buckets.problems.push(notification("satisfaction-low", `Satisfaction client basse (${satisfaction.toFixed(1)}/5).`, { source: "kpis" }));
  }

  const staffSatisfaction = safeNumber(kpis.staffSatisfaction, null);
  if (staffSatisfaction !== null && staffSatisfaction < 50) {
    buckets.alerts.push(notification("staff-morale-low", `Le moral de l'équipe est bas (${Math.round(staffSatisfaction)}/100).`, { source: "kpis" }));
  }

  return buckets;
}

function mergeBuckets(...bucketLists) {
  return bucketLists.reduce(
    (merged, buckets) => ({
      problems: [...merged.problems, ...safeArray(buckets?.problems)],
      alerts: [...merged.alerts, ...safeArray(buckets?.alerts)],
      opportunities: [...merged.opportunities, ...safeArray(buckets?.opportunities)],
    }),
    { problems: [], alerts: [], opportunities: [] }
  );
}

// Combines the rule-based, "right now" notifications with the
// Analytics-derived ones into the buckets Dashboard.jsx renders.
export function buildNotifications({ kpis, diagnostics } = {}) {
  return mergeBuckets(notificationsFromKpis(kpis), notificationsFromDiagnostics(diagnostics));
}

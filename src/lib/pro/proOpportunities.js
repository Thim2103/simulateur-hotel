// Opportunity tracking -- turns proScenario.js's scripted timeline
// triggers into rolling instances with an estimated ROI and a status,
// so pages/ProOpportunities.jsx can show what's available to seize right
// now. Symmetric to proCrises.js.
import { safeArray } from "../safe";

// options:
//   triggeredThisMonth: the "opportunity"-type entries from
//     proScenario.js's applyScheduledEvents() for this exact month.
//   previousOpportunities: the Pro state's own `opportunities` array
//     from last month.
//   month: the month just played.
//   seizedIds: opportunity ids the player has explicitly acted on this
//     month (see proActions.js's "saisir-opportunite").
export function computeOpportunities({ triggeredThisMonth = [], previousOpportunities = [], month = 0, seizedIds = [] } = {}) {
  const seized = new Set(seizedIds);

  const rolledOver = safeArray(previousOpportunities)
    .map((opportunity) => (seized.has(opportunity.id) ? { ...opportunity, status: "seized", seizedOnMonth: month } : opportunity))
    .map((opportunity) => {
      if (opportunity.status !== "available") return opportunity;
      const monthsRemaining = opportunity.monthsRemaining - 1;
      return monthsRemaining <= 0 ? { ...opportunity, status: "expired", monthsRemaining: 0 } : { ...opportunity, monthsRemaining };
    });

  const newlyTriggered = safeArray(triggeredThisMonth)
    .filter((entry) => entry.type === "opportunity")
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      department: entry.department || "general",
      roiEstimate: entry.roiEstimate ?? 0,
      triggeredOnMonth: month,
      monthsRemaining: entry.durationMonths ?? 3,
      status: "available", // available | seized | expired
      seizedOnMonth: null,
    }));

  return [...rolledOver, ...newlyTriggered];
}

export function availableOpportunities(opportunities) {
  return safeArray(opportunities).filter((opportunity) => opportunity.status === "available");
}

export function totalPotentialRoi(opportunities) {
  return availableOpportunities(opportunities).reduce((sum, opportunity) => sum + (opportunity.roiEstimate || 0), 0);
}

export const proOpportunities = { computeOpportunities, availableOpportunities, totalPotentialRoi };
export default proOpportunities;

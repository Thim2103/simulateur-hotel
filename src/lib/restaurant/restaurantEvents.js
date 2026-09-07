// Translates lib/events/eventEngine.js's output into restaurant-specific
// impact: which of today's events actually concern the restaurant (rush,
// health inspection, technical incidents -- see eventDefinitions.js's
// `category`), and what they mean for complaints/maintenance/demand and the
// operations task list.
import { safeArray } from "../safe";

const RESTAURANT_RELEVANT_CATEGORIES = ["restaurant", "compliance", "facilities"];
const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 };

function severityWeight(event) {
  return SEVERITY_WEIGHT[event?.severity] || SEVERITY_WEIGHT.medium;
}

// events: the DailyReport-shaped array from eventEngine.generateEvents()
// (id, name, category, message, severity, impact, ...).
export function deriveRestaurantImpact(events) {
  const relevantEvents = safeArray(events, []).filter((event) => RESTAURANT_RELEVANT_CATEGORIES.includes(event.category));

  const complaintsDelta = relevantEvents
    .filter((event) => event.category === "restaurant" || event.category === "compliance")
    .reduce((sum, event) => sum + severityWeight(event), 0);

  const maintenanceDelta = relevantEvents
    .filter((event) => event.category === "facilities")
    .reduce((sum, event) => sum + severityWeight(event) * 5, 0);

  const demandDelta = relevantEvents.filter((event) => event.id === "restaurant_rush").length * 12;

  const tasksToCreate = relevantEvents.map((event) => ({
    title: `Réagir : ${event.message || event.name}`,
    type: event.category === "facilities" ? "maintenance" : "complaint",
    status: "à faire",
    owner: "Équipe restaurant",
    priority: event.severity === "high" ? "haute" : "moyenne",
    dueIn: "Aujourd'hui",
    sourceEventId: event.id,
  }));

  return { relevantEvents, complaintsDelta, maintenanceDelta, demandDelta, tasksToCreate };
}

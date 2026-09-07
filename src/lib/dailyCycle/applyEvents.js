// Daily random/scripted events. Each candidate event has a trigger
// (a condition over today's hotel/restaurant/PMS state) and a probability;
// `rng` is injectable so this stays deterministic in tests (default: Math.random).
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countComplaints(operations) {
  return safeArray(operations).filter((task) => task.type === "complaint").length;
}

function countMaintenanceTasks(operations) {
  return safeArray(operations).filter((task) => task.type === "maintenance").length;
}

// id: stable identifier for the event type.
// probability(context): 0..1 chance this event fires today.
// impact(context): { revenue, cost, demand, satisfaction, reputation } deltas.
const EVENT_CATALOG = [
  {
    id: "equipment_failure",
    severity: "high",
    message: "Panne d'équipement en cuisine : intervention technicien en urgence.",
    probability: ({ restaurantState }) => (countMaintenanceTasks(restaurantState.operations) > 0 ? 0.25 : 0.08),
    impact: () => ({ cost: 450, demand: -2 }),
  },
  {
    id: "negative_review",
    severity: "medium",
    message: "Avis client négatif publié en ligne suite à une réclamation.",
    probability: ({ restaurantState }) => Math.min(0.6, countComplaints(restaurantState.operations) * 0.12),
    impact: () => ({ satisfaction: -0.15, reputation: -3, demand: -1.5 }),
  },
  {
    id: "vip_guest",
    severity: "low",
    message: "Un client VIP séjourne à l'hôtel et laisse un pourboire généreux.",
    probability: () => 0.05,
    impact: () => ({ revenue: 180, reputation: 2 }),
  },
  {
    id: "positive_review",
    severity: "low",
    message: "Excellent avis client publié en ligne : belle visibilité pour l'établissement.",
    probability: ({ restaurantState }) => (countComplaints(restaurantState.operations) === 0 ? 0.12 : 0.03),
    impact: () => ({ reputation: 3, demand: 1.5 }),
  },
  {
    id: "staff_sick_leave",
    severity: "medium",
    message: "Un membre du personnel est en arrêt maladie : renfort temporaire nécessaire.",
    probability: ({ restaurantState }) => (safeArray(restaurantState.staff).length > 0 ? 0.06 : 0),
    impact: () => ({ cost: 90, demand: -1 }),
  },
];

function emptyImpact() {
  return { revenue: 0, cost: 0, demand: 0, satisfaction: 0, reputation: 0 };
}

// Rolls each candidate event once against today's context and returns the
// ones that fire, plus the combined impact so the rest of the pipeline
// (finance, staff morale, demand) can react to them.
export function applyEvents({ hotelState = {}, restaurantState = {}, pmsState = {}, rng = Math.random } = {}) {
  const context = { hotelState, restaurantState, pmsState };

  const triggeredEvents = EVENT_CATALOG.filter((event) => rng() < Math.max(0, Math.min(1, event.probability(context)))).map(
    (event) => ({ id: event.id, severity: event.severity, message: event.message, impact: event.impact(context) })
  );

  const impacts = triggeredEvents.reduce((totals, event) => {
    Object.entries(event.impact).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + Number(value || 0);
    });
    return totals;
  }, emptyImpact());

  return { events: triggeredEvents, impacts };
}

export const dailyEventCatalog = EVENT_CATALOG.map((event) => event.id);

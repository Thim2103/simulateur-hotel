// Short-term, repeatable daily objectives: unlike achievements.js's
// one-time milestones, these can complete again on any day they hold true
// (e.g. "profitable day" every time the day closes in the black).
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countComplaints(operations) {
  return safeArray(operations).filter((task) => task.type === "complaint").length;
}

const OBJECTIVE_DEFINITIONS = [
  {
    id: "profitable_day",
    name: "Journée rentable",
    description: "Terminer la journée avec un profit positif.",
    check: ({ dailyReport }) => Number(dailyReport?.profit || 0) > 0,
  },
  {
    id: "full_house",
    name: "Complet",
    description: "Occuper 100% des chambres de l'hôtel.",
    check: ({ rooms, dailyReport }) => {
      const totalRooms = safeArray(rooms).length;
      return totalRooms > 0 && Number(dailyReport?.hotelRevenue?.occupiedRooms || 0) >= totalRooms;
    },
  },
  {
    id: "upsell_master",
    name: "Maître de l'upsell",
    description: "Générer plus de 100€ de revenus additionnels (upsells) en une journée.",
    check: ({ dailyReport }) => Number(dailyReport?.hotelRevenue?.upsellRevenue || 0) >= 100,
  },
  {
    id: "spotless_service",
    name: "Service impeccable",
    description: "Ne recevoir aucune réclamation client aujourd'hui.",
    check: ({ restaurantState }) => countComplaints(restaurantState?.operations) === 0,
  },
  {
    id: "happy_team",
    name: "Équipe épanouie",
    description: "Maintenir un moral d'équipe moyen supérieur à 85.",
    check: ({ restaurantState }) => {
      const staff = safeArray(restaurantState?.staff);
      if (!staff.length) return false;
      return staff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / staff.length >= 85;
    },
  },
];

// Returns the objectives that hold true today, each with its id/name/
// description (see achievements.js for the one-time equivalent).
export function checkObjectives(state = {}) {
  return OBJECTIVE_DEFINITIONS.filter((objective) => {
    try {
      return objective.check(state);
    } catch {
      return false;
    }
  }).map((objective) => ({ id: objective.id, name: objective.name, description: objective.description }));
}

export const objectiveDefinitions = OBJECTIVE_DEFINITIONS;

// HR-specific regional events: affect every hotel that shares a city, on
// top of (and independent from) lib/multiHotel/chainEvents.js's own
// regional/global events. Reuses lib/events/eventUtils.js's rng helper for
// consistency.
import { rollProbability } from "../events/eventUtils";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function groupByCity(hotels) {
  const groups = {};
  safeArray(hotels).forEach((hotel) => {
    const city = hotel.city || "unknown";
    groups[city] = groups[city] || [];
    groups[city].push(hotel.id);
  });
  return groups;
}

const REGIONAL_HR_EVENT_DEFINITIONS = [
  {
    id: "regional_strike",
    name: "Grève régionale du secteur",
    probability: 0.02,
    moraleDelta: -8,
    message: (city) => `Un mouvement de grève touche le secteur de l'hôtellerie-restauration à ${city}.`,
  },
  {
    id: "regional_job_fair",
    name: "Salon régional de l'emploi",
    probability: 0.04,
    moraleDelta: 3,
    message: (city) => `Un salon de l'emploi se tient à ${city} : l'équipe locale se sent valorisée et le recrutement est facilité.`,
  },
  {
    id: "regional_training_grant",
    name: "Subvention régionale à la formation",
    probability: 0.03,
    moraleDelta: 5,
    message: (city) => `Une subvention régionale à la formation professionnelle profite aux équipes de ${city}.`,
  },
];

// hotels: [{ id, city }] from the chain. Returns the events that fired
// plus a per-hotel morale (satisfaction) adjustment for staffEngine.js to
// apply -- this module never touches staff records directly.
export function applyStaffRegionalEvents({ hotels = [], rng = Math.random } = {}) {
  const cityGroups = groupByCity(hotels);
  const regionalEvents = [];
  const moraleAdjustmentsByHotelId = {};

  Object.entries(cityGroups).forEach(([city, hotelIds]) => {
    REGIONAL_HR_EVENT_DEFINITIONS.forEach((definition) => {
      if (!rollProbability(definition.probability, rng)) return;
      regionalEvents.push({ id: `${definition.id}_${city}`, name: definition.name, city, hotelIds, message: definition.message(city) });
      hotelIds.forEach((hotelId) => {
        moraleAdjustmentsByHotelId[hotelId] = (moraleAdjustmentsByHotelId[hotelId] || 0) + definition.moraleDelta;
      });
    });
  });

  return { regionalEvents, moraleAdjustmentsByHotelId };
}

// Chain-wide events, on top of each hotel's own local events (see
// lib/events/): regional ones affect every hotel that shares a city,
// global ones affect the whole chain regardless of location. Reuses
// lib/events/eventUtils.js's rng helpers for consistency with that module.
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

const REGIONAL_EVENT_DEFINITIONS = [
  {
    id: "regional_heatwave",
    name: "Canicule régionale",
    probability: 0.05,
    impact: { revenuePercent: 0.05, expensesPercent: 0.03 },
    message: (city) => `Une vague de chaleur touche ${city} : hausse de la demande, surcoût énergétique pour tous les hôtels de la région.`,
  },
  {
    id: "regional_convention",
    name: "Grand salon régional",
    probability: 0.04,
    impact: { revenuePercent: 0.1, expensesPercent: 0 },
    message: (city) => `Un salon professionnel majeur se tient à ${city} : forte hausse de la demande hôtelière dans la région.`,
  },
];

const GLOBAL_EVENT_DEFINITIONS = [
  {
    id: "global_economic_downturn",
    name: "Ralentissement économique mondial",
    probability: 0.02,
    impact: { revenuePercent: -0.06, expensesPercent: 0 },
    message: "Un ralentissement économique mondial pèse sur la demande de voyages dans toute la chaîne.",
  },
  {
    id: "global_travel_boom",
    name: "Essor mondial du tourisme",
    probability: 0.03,
    impact: { revenuePercent: 0.08, expensesPercent: 0 },
    message: "Une tendance mondiale favorable au voyage profite à l'ensemble de la chaîne.",
  },
];

// hotels: [{ id, city, hotelState }] from the chain. Returns the events
// that fired plus a per-hotel revenue/expense adjustment (a percentage of
// that hotel's own day, applied by chainEngine.js when consolidating
// finance -- this module never touches per-hotel state directly).
export function applyRegionalEvents({ hotels = [], rng = Math.random } = {}) {
  const cityGroups = groupByCity(hotels);
  const regionalEvents = [];
  const globalEvents = [];
  const adjustmentsByHotelId = {};

  const addAdjustment = (hotelIds, impact) => {
    hotelIds.forEach((hotelId) => {
      const current = adjustmentsByHotelId[hotelId] || { revenuePercent: 0, expensesPercent: 0 };
      adjustmentsByHotelId[hotelId] = {
        revenuePercent: current.revenuePercent + impact.revenuePercent,
        expensesPercent: current.expensesPercent + impact.expensesPercent,
      };
    });
  };

  Object.entries(cityGroups).forEach(([city, hotelIds]) => {
    REGIONAL_EVENT_DEFINITIONS.forEach((definition) => {
      if (!rollProbability(definition.probability, rng)) return;
      regionalEvents.push({ id: `${definition.id}_${city}`, name: definition.name, city, hotelIds, message: definition.message(city) });
      addAdjustment(hotelIds, definition.impact);
    });
  });

  const allHotelIds = safeArray(hotels).map((hotel) => hotel.id);
  GLOBAL_EVENT_DEFINITIONS.forEach((definition) => {
    if (!rollProbability(definition.probability, rng)) return;
    globalEvents.push({ id: definition.id, name: definition.name, message: definition.message });
    addAdjustment(allHotelIds, definition.impact);
  });

  return { regionalEvents, globalEvents, adjustmentsByHotelId };
}

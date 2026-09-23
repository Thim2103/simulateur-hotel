// DESTINATIONS (Étape 5's market data layer): where the hotel sits, and
// what that means for demand. `seasonalityProfile` is keyed by the exact
// season ids lib/hotelEvents/hotelEventsEngine.js's own seasonOn()/
// seasonIdOn() already compute ("summer", "holidays", "low", "shoulder")
// -- reused, not reinvented, so "what season is it" always means the
// same thing everywhere in the app. `baseDemand` is a destination's own
// market-size multiplier (1 = an average market); `eventFrequency` is
// the share of days worth surfacing a local event on (see
// marketContextEngine.js's localEventOf()); `typicalSegments` names
// entries from segments.js. Static data, no state.
export const DESTINATIONS = [
  {
    id: "ardennes",
    name: "Ardennes / Campagne",
    icon: "🌲",
    seasonalityProfile: { summer: 1.15, holidays: 1.05, low: 0.75, shoulder: 1 },
    baseDemand: 0.75,
    eventFrequency: 0.15,
    typicalSegments: ["hikers-eco", "couples-leisure", "families"],
  },
  {
    id: "bruxelles",
    name: "Bruxelles",
    icon: "🏛️",
    seasonalityProfile: { summer: 0.9, holidays: 0.85, low: 0.95, shoulder: 1.05 },
    baseDemand: 1.1,
    eventFrequency: 0.3,
    typicalSegments: ["business", "couples-leisure"],
  },
  {
    id: "paris",
    name: "Paris",
    icon: "🗼",
    seasonalityProfile: { summer: 1.2, holidays: 1.3, low: 0.9, shoulder: 1.1 },
    baseDemand: 1.3,
    eventFrequency: 0.35,
    typicalSegments: ["business", "couples-leisure", "families"],
  },
  {
    id: "cote-belge",
    name: "Côte Belge",
    icon: "🌊",
    seasonalityProfile: { summer: 1.5, holidays: 1.1, low: 0.6, shoulder: 0.9 },
    baseDemand: 0.9,
    eventFrequency: 0.2,
    typicalSegments: ["families", "couples-leisure"],
  },
  {
    id: "bali",
    name: "Bali",
    icon: "🌴",
    seasonalityProfile: { summer: 1.1, holidays: 1.25, low: 1, shoulder: 1.15 },
    baseDemand: 1.2,
    eventFrequency: 0.25,
    typicalSegments: ["couples-leisure", "hikers-eco"],
  },
];

// "Ma Première Auberge" (Étape 3) is a small rural inn -- Ardennes/
// Campagne is its default destination, read whenever a hotel's own
// hotelState.market.destinationId is missing (see
// marketContextEngine.js's destinationOf(), the fallback that keeps
// every career started before Étape 5 working unchanged).
export const DEFAULT_DESTINATION_ID = "ardennes";

export function destinationById(id) {
  return DESTINATIONS.find((destination) => destination.id === id) || DESTINATIONS.find((destination) => destination.id === DEFAULT_DESTINATION_ID);
}

export default DESTINATIONS;

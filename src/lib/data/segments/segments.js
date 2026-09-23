// Guest SEGMENTS (Étape 5's market data layer): who books, what they
// care about. Distinct from lib/clients/guestProfiles.js's PROFILES
// (family/business/long-stay/vip -- how an individual reservation is
// scored and reviewed once it exists): a segment is a market-level
// archetype the data layer reads to describe *who a destination
// typically attracts*, not a per-guest simulation input. Static data,
// no state.
export const SEGMENTS = [
  {
    id: "couples-leisure",
    label: "Couples / Leisure",
    icon: "💑",
    priceSensitivity: 0.5,
    qualityExpectations: 0.6,
    servicePreferences: ["romantisme", "calme"],
    leadTimeDays: 14,
  },
  {
    id: "families",
    label: "Familles",
    icon: "👨‍👩‍👧",
    priceSensitivity: 0.7,
    qualityExpectations: 0.5,
    servicePreferences: ["espace", "activités enfants"],
    leadTimeDays: 30,
  },
  {
    id: "business",
    label: "Business",
    icon: "💼",
    priceSensitivity: 0.2,
    qualityExpectations: 0.8,
    servicePreferences: ["wifi", "rapidité", "calme"],
    leadTimeDays: 3,
  },
  {
    id: "hikers-eco",
    label: "Randonneurs / Éco",
    icon: "🥾",
    priceSensitivity: 0.8,
    qualityExpectations: 0.4,
    servicePreferences: ["nature", "petit-déjeuner local"],
    leadTimeDays: 7,
  },
];

export const DEFAULT_SEGMENT_ID = "couples-leisure";

export function segmentById(id) {
  return SEGMENTS.find((segment) => segment.id === id) || SEGMENTS.find((segment) => segment.id === DEFAULT_SEGMENT_ID);
}

export default SEGMENTS;

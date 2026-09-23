// Local COMPETITOR archetypes (Étape 5's market data layer): what the
// player is priced against. Each names the destinations.js ids it
// competes in (`destinationIds`) -- several destinations can share an
// archetype (a "Resort Éco" exists on the coast and in Bali alike).
// Static data, no state.
export const COMPETITORS = [
  {
    id: "auberge-du-village",
    name: "L'Auberge du Village",
    icon: "🏚️",
    destinationIds: ["ardennes"],
    starRating: 2,
    basePrice: 65,
    reputation: 55,
    servicesOffered: ["petit-déjeuner", "parking"],
  },
  {
    id: "boutique-hotel-central",
    name: "Boutique Hôtel Central",
    icon: "🏨",
    destinationIds: ["bruxelles", "paris"],
    starRating: 4,
    basePrice: 145,
    reputation: 78,
    servicesOffered: ["spa", "restaurant gastronomique", "conciergerie"],
  },
  {
    id: "resort-eco",
    name: "Resort Éco",
    icon: "🌿",
    destinationIds: ["cote-belge", "bali", "ardennes"],
    starRating: 3,
    basePrice: 95,
    reputation: 70,
    servicesOffered: ["spa", "activités nature", "petit-déjeuner bio"],
  },
];

export function competitorsForDestination(destinationId) {
  return COMPETITORS.filter((competitor) => competitor.destinationIds.includes(destinationId));
}

export default COMPETITORS;
